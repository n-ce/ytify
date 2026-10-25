# Backend API Contracts & Parsing

## Overview

This document describes the ytify backend API: response formats, parsing mechanisms, and data structure contracts. It consolidates the API contract (what clients receive) and parsing implementation (how we transform YouTube data).

---

## Part 1: API Response Contracts

### 1. Track Items (`YTItem`)

**Type Definition:**

```typescript
interface YTItem extends TrackItem {
  img?: string; // Thumbnail ID (for songs)
  albumId?: string; // Playlist ID (OLAK...) for songs
  albumTitle?: string; // Album title for songs
  subtext?: string; // "views • published" or "album • views"
  type: "video" | "song";
}

interface TrackItem {
  id: string; // Video ID (11 chars)
  title: string;
  duration: string; // MM:SS or HH:MM:SS
  author: string;
  authorId: string; // Channel ID (UC...)
  albumId?: string;
  albumTitle?: string;
  img?: string;
  modified?: number; // Timestamp for sync
  context?: {
    src: Context;
    id: string;
  };
}
```

**Availability by Source:**

| Source                 | type           | img           | albumId / albumTitle | subtext format      |
| ---------------------- | -------------- | ------------- | -------------------- | ------------------- |
| Regular search (video) | "video"        | ❌            | ❌                   | "views • published" |
| Music search (song)    | "song"         | ✅            | ✅                   | "album • views"     |
| Playlist tracks        | "video"        | ❌            | ❌                   | "views • published" |
| Album tracks           | "song"         | ✅            | ✅                   | album name          |
| Artist songs           | "song"         | ✅            | ✅                   | "album • views"     |
| Channel videos         | "video"        | ❌            | ❌                   | "views • published" |
| SubFeed                | "video"        | ❌            | ❌                   | "views • published" |
| Similar tracks         | "song"→"video" | ❌ (stripped) | ❌ (stripped)        | N/A                 |

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
  type: "channel";
  subscribers?: string;
  videoCount?: string;
  description?: string;
  items?: YTItem[];
}

interface YTPlaylistItem extends ListItem {
  type: "playlist";
  author?: string;
  videoCount?: string;
  items?: YTItem[];
  hasContinuation?: boolean;
}

interface YTArtistItem extends ListItem {
  type: "artist";
  subscribers?: string;
  items?: YTItem[];
  albums?: YTAlbumItem[];
  eps?: YTAlbumItem[];
}

interface YTAlbumItem extends ListItem {
  type: "album";
  author: string;
  year?: string;
  playlistId?: string;
  items?: YTItem[];
}
```

---

### 3. Specific API Responses

| Endpoint                                   | Response                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `GET /api/search`                          | `(YTItem \| YTListItem)[]` - mixed by filter                                                        |
| `GET /api/suggestions`                     | `string[]`                                                                                          |
| `GET /api/playlist`                        | `YTPlaylistItem` with `items`, `hasContinuation`                                                    |
| `GET /api/album`                           | `YTAlbumItem` with `items`                                                                          |
| `GET /api/artist`                          | `YTArtistItem` with `items` (songs), `albums`, `eps`                                                |
| `GET /api/channel`                         | `YTChannelItem` with `items`                                                                        |
| `GET /api/featured?ids=&artistIds=&limit=` | `{ featuredPlaylists: YTPlaylistItem[], communityPlaylists: YTPlaylistItem[], artists: Channel[] }` |
| `GET /api/subfeed`                         | `YTItem[]` with `publishedMs`                                                                       |
| `GET /api/similar`                         | `YTItem[]` (stripped fields)                                                                        |

### 3a. Global Catalog & Gate Endpoints

Backed by Cloudflare Durable Objects (`CatalogDO`, `StreamGateDO`, `UserSyncDO`).

| Endpoint                                           | Response                                                  |
| -------------------------------------------------- | --------------------------------------------------------- |
| `GET /api/catalog/tracks?ids=a,b`                  | `Record<trackId, CanonicalTrack>`                         |
| `GET /api/catalog/track?id=`                       | `CanonicalTrack` or 404                                   |
| `POST /api/catalog/tracks`                         | `{ ok: true }` - batch upsert, token-gated                |
| `GET /api/catalog/categories?type=`                | `Category[]`                                              |
| `GET /api/catalog/playlists?category=`             | `CuratedPlaylist[]` (public shape, with `trackIds`)       |
| `GET /api/featured?ids=a,b&artistIds=c,d&limit=20` | `{ featuredPlaylists, communityPlaylists, artists }`      |
| `GET /api/recommend?ids=a,b&limit=10`              | `{ playlists: Recommendation[] }` (ytmgr service)         |
| `POST /api/stream-gate/acquire`                    | `{ granted, keyIndex, ... }` or rejection                 |
| `POST /api/stream-gate/release`                    | `{ ok: true }` + key telemetry                            |
| `GET /api/stream-gate/state`                       | Lease, key, and cooldown diagnostics                      |

**Canonical Track Schema**:

```typescript
interface CanonicalTrack {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  duration?: number;
  durationStr?: string;
  isSong?: boolean;
  thumbnailId?: string; // Required for songs, omitted for videos
  albumId?: string; // For songs
  albumTitle?: string; // For songs
  source?: string;
  updatedAt?: number;
}
```

Write routes (`POST /api/catalog/tracks`, `/api/stream-gate/*`, `/api/cron/*`) require `x-ytify-token` matching `INTERNAL_TOKEN` when configured. Reads are public.

---

## Part 2: Parsing Implementation

### Architecture

```
HTTP Request → Worker → Backend Function → youtubei.js (InnerTube)
```

### Core Utilities (`src/backend/utils.ts`)

#### Thumbnail Processing

- `getThumbnail(thumbnails)` - Select highest resolution thumbnail
- `getThumbnailId(url)` - Extract clean ID from thumbnail URL
  - Video thumbnails: bare 11-char ID
  - Avatars/music art: `/`-prefixed bucket path (`/ytc/...`, `/a-/...`)
- `formatThumbnailId(url)` - Canonical formatting

#### Stream Mapper (`streamMapper`)

Transforms InnerTube nodes → `YTItem`

| Node Type                 | Source                            | Output Type |
| ------------------------- | --------------------------------- | ----------- |
| `Video`                   | Regular search, channel videos    | `video`     |
| `LockupView`              | Modern YouTube layout             | `video`     |
| `MusicResponsiveListItem` | YouTube Music search/album/artist | `song`      |

- **Video Node**: Filters out Shorts (< 90 seconds).
- **LockupView (Modern Layout)**:
  In `youtubei.js >= 18.2.0`, duration is parsed natively (`lockup.duration.text` and `lockup.duration.seconds`).
  Filters out Shorts (< 90 seconds) using `durationSeconds`.
  `getLockupMeta()` extracts `views`, `published`, `duration`, `durationSeconds`, `author`, and `authorId`.
- **MusicResponsiveListItem (YouTube Music)**:
  Extracts `albumId`, `albumTitle`, and cover art `thumbnailId`.

#### List Mapper (`listMapper`)

Transforms InnerTube nodes → `YTListItem`

| Node Type                                | Source                        | Output Type      |
| ---------------------------------------- | ----------------------------- | ---------------- |
| `LockupView`                             | Search results, playlist grid | `playlist`       |
| `Playlist`                               | Direct playlist fetch         | `playlist`       |
| `Channel`                                | Channel search, subscriptions | `channel`        |
| `MusicResponsiveListItem` (artist/album) | Music search                  | `artist`/`album` |
