# Backend API Contracts & Parsing

## Overview
This document describes the ytify backend API: response formats, parsing mechanisms, and data structure contracts. It consolidates the API contract (what clients receive) and parsing implementation (how we transform YouTube data).

---

## Part 1: API Response Contracts

### 1. Track Items (`YTItem`)

**Type Definition:**
```typescript
interface YTItem extends TrackItem {
  img?: string;           // Thumbnail ID (for songs)
  albumId?: string;       // Playlist ID (OLAK...) for songs
  subtext?: string;       // "views • published" or "album • views"
  type: 'video' | 'song';
}

interface TrackItem {
  id: string;             // Video ID (11 chars)
  title: string;
  duration: string;       // MM:SS or HH:MM:SS
  author: string;
  authorId: string;       // Channel ID (UC...)
  modified?: number;      // Timestamp for sync
  context?: {
    src: Context;
    id: string;
  };
}
```

**Availability by Source:**

| Source | type | img | albumId | subtext format |
|--------|------|-----|---------|----------------|
| Regular search (video) | "video" | ❌ | ❌ | "views • published" |
| Music search (song) | "song" | ✅ | ✅ | "album • views" |
| Playlist tracks | "video" | ❌ | ❌ | "views • published" |
| Album tracks | "song" | ✅ | ✅ | album name |
| Artist songs | "song" | ✅ | ✅ | "album • views" |
| Channel videos | "video" | ❌ | ❌ | "views • published" |
| SubFeed | "video" | ❌ | ❌ | "views • published" |
| Similar tracks | "song"→"video" | ❌ (stripped) | ❌ (stripped) | N/A |

---

### 2. Collection Items (`YTListItem`)

**Type Definition:**
```typescript
type YTListItem = YTChannelItem | YTPlaylistItem | YTArtistItem | YTAlbumItem;

interface ListItem {
  id: string;
  name: string;
  img: string;
}

interface YTChannelItem extends ListItem {
  type: 'channel';
  subscribers?: string;
  videoCount?: string;
  description?: string;
  items?: YTItem[];
}

interface YTPlaylistItem extends ListItem {
  type: 'playlist';
  author?: string;
  videoCount?: string;
  items?: YTItem[];
  hasContinuation?: boolean;
}

interface YTArtistItem extends ListItem {
  type: 'artist';
  subscribers?: string;
  items?: YTItem[];
  albums?: YTAlbumItem[];
}

interface YTAlbumItem extends ListItem {
  type: 'album';
  author: string;
  year?: string;
  playlistId?: string;
  items?: YTItem[];
}
```

---

### 3. Specific API Responses

| Endpoint | Response |
|----------|----------|
| `GET /api/search` | `(YTItem \| YTListItem)[]` - mixed by filter |
| `GET /api/suggestions` | `string[]` |
| `GET /api/playlist` | `YTPlaylistItem` with `items`, `hasContinuation` |
| `GET /api/album` | `YTAlbumItem` with `items` |
| `GET /api/artist` | `YTArtistItem` with `items` (songs), `albums` |
| `GET /api/channel` | `YTChannelItem` with `items` |
| `GET /api/gallery` | `{ userArtists, relatedArtists, relatedPlaylists }` |
| `GET /api/subfeed` | `YTItem[]` with `publishedMs` |
| `GET /api/similar` | `YTItem[]` (stripped fields) |

---

## Part 2: Parsing Implementation

### Architecture
```
HTTP Request → Worker → Backend Function → youtubei.js (InnerTube)
                                      │
                                      ▼
                              ┌───────────────┐
                              │  YTNodes      │  (Typed AST)
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │ streamMapper  │  → YTItem (tracks)
                              │ listMapper    │  → YTListItem (collections)
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │ ytify Types   │
                              └───────┬───────┘
                                      │
                                      ▼
                              JSON Response
```

### Core Parsing Functions

#### `getClient()` - InnerTube Singleton
```typescript
export async function getClient(): Promise<Innertube>
```
- Singleton Innertube instance
- `UniversalCache(false)` - no persistence
- `generate_session_locally: true` - no PoToken needed
- `retrieve_player: false` - don't fetch player config

#### Thumbnail Utilities
- `getThumbnailId(url)` - Extract video/playlist ID from multiple URL formats
- `formatThumbnailId(rawUrl)` - Normalize for client (empty for maxresdefault, 11-char IDs direct, `/` prefix for others)
- `getThumbnail(thumbnails)` - Pick highest resolution by width

#### Duration/Formatting
- `formatDuration(text)` - Pad single-digit minutes ("4:30" → "04:30")
- `parsePublished(text)` - Relative time to Unix timestamp (ms)

---

### Stream Mapper (`streamMapper`)

Transforms youtubei.js nodes → `YTItem`

| Node Type | Source | Output Type |
|-----------|--------|-------------|
| `Video` | Regular search, channel videos | `video` |
| `LockupView` | Modern YouTube layout, music search | `video` |
| `MusicResponsiveListItem` | YouTube Music search/album/artist | `song` |

**Video Node:**
```typescript
{
  id: video.id,
  title: video.title,
  author: video.author.name,
  authorId: video.author.id,
  duration: formatDuration(video.duration.text),
  subtext: "views • published",
  type: "video"
}
```
- Filters out Shorts (< 90 seconds)

**LockupView (Modern Layout):**
Uses `getLockupMeta()` to extract:
- `views` - from metadata rows
- `published` - relative time string
- `duration` - from thumbnail overlay badge
- `author` - first metadata row
- `authorId` - from endpoint payload browseId

**MusicResponsiveListItem (YouTube Music):**
```typescript
{
  id: videoId (from overlay or menu),
  title: song.title,
  author: song.artists[0].name + " - Topic",
  authorId: song.artists[0].channel_id,
  albumId: playlistId (OLAK... from menu),
  duration: formatDuration(song.duration.text),
  img: formatted thumbnail ID,
  subtext: "album • views",
  type: "song"
}
```

---

### List Mapper (`listMapper`)

Transforms youtubei.js nodes → `YTListItem`

| Node Type | Source | Output Type |
|-----------|--------|-------------|
| `LockupView` | Search results, grid items | `playlist` |
| `Playlist` | Direct playlist fetch | `playlist` |
| `Channel` | Channel search, subscriptions | `channel` |
| `MusicResponsiveListItem` (artist/album) | Music search | `artist`/`album` |

---

### Lockup Metadata Extraction (`getLockupMeta`)

Parses modern `LockupView` metadata layout:
```
LockupView
├── metadata → LockupMetadataView
│   └── metadata_rows[] → MetadataRowView
│       └── metadata_parts[] → MetadataPart
│           ├── text (string)
│           └── endpoint?.payload?.browseId (authorId)
├── content_image → CollectionThumbnailView
│   ├── primary_thumbnail
│   │   ├── image[].url (thumbnail)
│   │   └── overlays[] (duration badge)
│   └── overlays (duration badge)
```

**Extraction Logic:**
1. **Author**: First metadata row, first part
2. **AuthorId**: From text endpoint payload OR image renderer context
3. **Views**: Part matching `^\d*\.?\d+[KMB]?\s+views?$`
4. **Published**: Part matching `\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago$`
5. **Duration**: From thumbnail overlay badge (`ThumbnailBottomOverlayView`)

---

### API-Specific Parsing

| Endpoint | Key Details |
|----------|-------------|
| `getSearch` | Music vs regular search, upload date sort via `parsePublished()` |
| `getPlaylist` | Music playlists (RD*, OLAK*) via `yt.music.getPlaylist()`, continuation loop |
| `getAlbum` | Header parsing (MusicDetailHeader/MusicResponsiveHeader), playlistId extraction |
| `getArtist` | Header (MusicImmersiveHeader/MusicVisualHeader), albums via carousel shelves |
| `getChannel` | Videos via `channel.getVideos()` |
| `getGallery` | Batch fetch artists, aggregate "Featured on" + "Fans might also like", deduplicate |
| `getSubFeed` | Parallel channel fetch, filter >90s, sort by publishedMs desc |
| `getSimilar` | Last.fm API → YouTube Music search, strip subtext/albumId/img |
| `getSearchSuggestions` | Music: `yt.music.getSearchSuggestions()`, Regular: `yt.getSearchSuggestions()` |

---

## Part 3: Known Issues & Data Structure Problems

### 1. Inconsistent Track Properties
| Property | Video | Song | Similar | SubFeed |
|----------|-------|------|---------|---------|
| `img` | ❌ | ✅ | ❌ | ❌ |
| `albumId` | ❌ | ✅ | ❌ | ❌ |
| `subtext` | ✅ | ✅ | ❌ | ✅ |
| `type` | "video" | "song" | "song"→"video" | "video" |

**Problem:** Client must handle optional fields differently per source.

### 2. Duplicate Collection Structures
- 4 interfaces share `id`, `name`, `img`, `type` with slightly different optionals
- `items` array inconsistent

### 3. Inconsistent Naming
- `videoCount` (playlist) vs `subscribers` (channel) vs `videoCount` (channel)
- `author` (playlist) vs `author` (album) - different meanings

### 4. Mixed Arrays
- `getSearch` returns `(YTItem \| YTListItem)[]` - requires type guards
- `getGallery` returns separate arrays

---

## Part 4: Proposed Unified Structure (from DATA_STRUCTURE_SIMPLIFICATION)

### Discriminated Union Approach
```typescript
type MediaKind = 'track' | 'collection';

interface MediaBase {
  kind: MediaKind;
  id: string;
  name: string;
  artwork: string;
  type: MediaType;
}

type MediaType = 'video' | 'song' | 'playlist' | 'channel' | 'artist' | 'album';

interface TrackMedia extends MediaBase {
  kind: 'track';
  type: 'video' | 'song';
  author: string;
  authorId: string;
  duration: string;
  albumId?: string;
  context: { src: Context; id: string };
  metadata: TrackMetadata;
}

interface CollectionMedia extends MediaBase {
  kind: 'collection';
  type: 'playlist' | 'channel' | 'artist' | 'album';
  owner?: string;
  count: number;
  metadata: CollectionMetadata;
  items?: MediaItem[];
}

type MediaItem = TrackMedia | CollectionMedia;
```

### Migration Phases
1. **Backend Normalization** - Populate all optional fields with defaults, add `kind` discriminator
2. **Type Unification** - Introduce `MediaItem` union, update mappers
3. **Client Migration** - Update components, remove type guards
4. **Cleanup** - Remove deprecated types

---

## Test Coverage
Backend test suite (`scripts/test-backend.ts`) validates:
- All 12 API endpoints return expected structure
- Required fields present on all item types
- Optional fields handled gracefully
- Type discriminators work correctly

Run: `bun run backend`

---

## Related Files
- `src/backend/utils.ts` - Core parsing (`streamMapper`, `listMapper`, `getLockupMeta`)
- `src/backend/get*.ts` - 8 endpoint handlers
- `src/backend/worker.ts` - Routing
- `src/types.d.ts` - TypeScript interfaces

## Non-Goals
- Documenting youtubei.js internals beyond what we use
- Specifying InnerTube API (external dependency)
- Client-side data transformations (see feature specs)