# Architecture Plan: Normalized Song & Video Catalog Engine

## 1. Why We Are Doing This

### The Core Problems Today

1. **Severe Quota Sensitivity:**
   Cloudflare Durable Objects enforce a hard ceiling of **100,000 SQLite rows written per 24 hours**. On October 18, an uncontrolled scrape process attempted to insert ~300,000 tracks in a single Sunday morning, burning through the 100k daily write budget in 3 hours and causing cascade 500-errors.
2. **Eliminating Dead Moods & Genres Scraping in Favor of User-Driven Artist Loading:**
   Generic mood categories (e.g., "commute", "focus") scrape thousands of obscure, irrelevant tracks that ytify users may never listen to.
   **New Strategic Decision:** Eliminate the Moods & Genres scraper entirely. Instead, use the **Artist Loading Event** (`Featured on` shelf + artist discography) as the primary organic catalog ingestion trigger. This indexes only what active users actually favorite and listen to.
3. **The Playlist Video vs. Song Problem:**
   When YouTube Music playlists are fetched, YouTube often includes generic **Video IDs** (official music videos with skits/intros, live cuts, or UGC uploads) rather than their pure **Song counterparts** (`MUSIC_VIDEO_TYPE_ATV`, "- Topic" releases). Videos lack square album art (`thumbnailId`) and release IDs (`albumId`).
   - **Solution (Technique A):** We will leverage YouTube Music's native paired dual-entity navigation endpoints inside the item's menu items to automatically resolve the paired audio Song `videoId` and Album ID without firing extra API calls.
4. **Data Model Pollution & Inconsistency:**
   Official YouTube Music **Songs** and generic YouTube **Videos** represent fundamentally distinct entities:
   - **Songs (`canonical_songs`):** Official releases with album title, album ID, square release cover art (`thumbnail_id`), and clean artist names (stripped of `\" - Topic\"`).
   - **Videos (`canonical_videos`):** Content without an album (podcasts, music videos, UGC). **No thumbnail ID is stored** because video thumbnails are directly derived from the video ID by the client (`https://i.ytimg.com/vi/<id>/mqdefault.jpg`).

---

## 2. The Architectural Solution: Two Specialized Databases

Instead of one overloaded table, `CatalogDO` will maintain two distinct, optimized SQLite tables:

```
                               Incoming Track Input
                      (Search, Artist Load, Playback, Sync)
                                       │
                      Is it an Audio Track Video (ATV)
                         or "- Topic" release?
                                  /         \
                             YES /           \ NO (Check Technique A
                                /             \    Menu Navigation)
                               ▼               ▼
                     ┌──────────────────┐    ┌──────────────────┐
                     │ canonical_songs  │    │ canonical_videos │
                     ├──────────────────┤    ├──────────────────┤
                     │ id (PK)          │    │ id (PK)          │
                     │ title            │    │ title            │
                     │ author (clean)   │    │ author (channel) │
                     │ author_id        │    │ author_id        │
                     │ album_id         │    │ duration         │
                     │ album_title      │    │ duration_str     │
                     │ thumbnail_id     │    │ source           │
                     │ duration         │    │ updated_at       │
                     │ duration_str     │    └──────────────────┘
                     │ source           │
                     │ updated_at       │
                     └──────────────────┘
```

### Table 1: `canonical_songs`

- **Purpose:** Single source of truth for all official music tracks.
- **Fields:**
  - `id TEXT PRIMARY KEY`: YouTube 11-char video ID.
  - `title TEXT NOT NULL`: Song title.
  - `author TEXT NOT NULL`: Clean artist name (stripped of `\" - Topic\"` suffix).
  - `author_id TEXT`: YouTube Music artist channel ID (`UC...`).
  - `album_id TEXT`: YouTube Music browse ID for the release (`MPREb_...` / `OLAK...`).
  - `album_title TEXT`: Official album/EP/single name.
  - `thumbnail_id TEXT NOT NULL`: Square cover art image ID (extracted from ATV releases).
  - `duration INTEGER`: Duration in seconds.
  - `duration_str TEXT`: Formatted duration (`\"3:45\"`).
  - `source TEXT`: Origin (`\"search\"`, `\"artist_featured\"`, `\"sync\"`, `\"fix_metadata\"`).
  - `updated_at INTEGER`: Millisecond timestamp for last-write-wins (LWW) resolution.
- **Indexes:** `idx_songs_album(album_id)`, `idx_songs_author(author)`, `idx_songs_updated(updated_at)`.

### Table 2: `canonical_videos`

- **Purpose:** Lightweight index for non-album video content (covers, live performances, podcasts, music videos).
- **Fields:**
  - `id TEXT PRIMARY KEY`: YouTube 11-char video ID.
  - `title TEXT NOT NULL`: Video title.
  - `author TEXT NOT NULL`: Channel / Uploader name.
  - `author_id TEXT`: YouTube channel ID.
  - `duration INTEGER`: Duration in seconds.
  - `duration_str TEXT`: Formatted duration.
  - `source TEXT`: Origin (`\"search\"`, `\"sync\"`).
  - `updated_at INTEGER`: Millisecond timestamp for LWW resolution.
- **Zero Thumbnail Overhead:** `thumbnail_id` is omitted for videos because video thumbnails are deterministically constructed directly from the YouTube video `id` by clients (`https://i.ytimg.com/vi/<id>/mqdefault.jpg`), saving database bytes and write overhead.
- **Indexes:** `idx_videos_author(author)`.

---

## 3. Technique A: Resolving Songs from Playlist Videos

### Why Playlists Return Videos

When a playlist is loaded via InnerTube, YouTube Music often includes video entries (even in official playlists). However, YouTube Music internally pairs every popular video with its official Audio Track Video (ATV) song entity so users can toggle between "Song" and "Video" mode in the app.

### How Technique A Works (Zero Extra Network Requests)

In InnerTube's `MusicResponsiveListItem` (or `PlaylistVideo`):

1. **Menu Navigation Inspection:**
   The item's `menu.items` array contains navigation endpoints for the track actions:
   - `MenuNavigationItem` with an icon of `MUSIC_NOTE` or title `"Play song"` / `"View song"`.
   - The payload endpoint directly exposes the official audio song `videoId`!
2. **Album Navigation Inspection:**
   - A `MenuNavigationItem` with title `"View album"` contains `endpoint.payload.browseId` (`MPREb_...`) or `playlistId` (`OLAK...`).
3. **Extraction & Canonical Routing:**
   - If the item itself is an ATV (`isSong: true`), it is written to `canonical_songs`.
   - If the item is a video BUT contains the paired song endpoint in `menu.items`:
     - Extract the paired song `videoId`, album ID, and album title.
     - Save the paired song to `canonical_songs`.
     - Save the video entity to `canonical_videos`.
   - If no song counterpart exists (e.g. pure UGC/podcast), write strictly to `canonical_videos`.

---

## 4. Ingestion Engine: Driven by Artist Loading & User Activity

Instead of running scheduled background scrapers that hammer Cloudflare:

1. **Artist "Featured On" Shelf Ingestion:**
   When a user views an artist or when `/featured?artistIds=...` is queried:
   - The artist's `Featured on` playlists are retrieved.
   - Playlist tracks are extracted and parsed via **Technique A**.
   - Songs are written to `canonical_songs`; videos to `canonical_videos`.
2. **Organic Search Ingestion:**
   - Real-time search results via `/search` parse `- Topic` tracks and write them to `canonical_songs`.
3. **Isolate-Level Deduplication Latch:**
   - The Worker isolate maintains an in-memory `Set<string>` of recently written IDs to prevent re-writing existing tracks on repeated queries.
4. **Target Write Budget:**
   - Routine browsing and artist loads will generate ~100–400 writes/day, keeping daily usage below **0.5%** of Cloudflare's 100,000 write limit.

---

## 5. Downstream Consumer Benefits

1. **`metadataFixer`:**
   Queries `canonical_songs` to instantly clean corrupted song titles, attach real album names, and restore square release covers without hitting YouTube.
2. **`StreamGateDO` (Stream Fallback):**
   When streaming audio fallback, looks up `canonical_songs` to attach official album cover art and release titles.
3. **`UserSyncDO` (Cloud Sync):**
   User sync stays fast and lightweight. Sync pulls automatically hydrate tracks from `canonical_songs`.

---

## 6. Execution Roadmap

- [ ] **Step 1: Core Type Updates**
  - Update `TrackItem` in `src/types.d.ts` to include `img?: string`, `albumId?: string`, and `albumTitle?: string`.
  - Update `src/backend/catalog.ts` with `CanonicalSong` and `CanonicalVideo` interfaces.
- [ ] **Step 2: Investigate Technique A in YouTubei.js**
  - Write a diagnostic script to inspect `yt.music.getPlaylist()` or `yt.music.getArtist()` menu items and verify the exact AST structure of the paired song `videoId` and album navigation items.
- [ ] **Step 3: Database Schema & Engine Evolution**
  - Update `CatalogDO.ts` with `canonical_songs` and `canonical_videos` tables.
  - Implement specialized `upsertSongs()` and `upsertVideos()`.
- [ ] **Step 4: Wire Ingestion to Artist & Search Flow**
  - Integrate Technique A into `src/backend/utils.ts` and `src/backend/getFeatured.ts`.
- [ ] **Step 5: Test Verification**
  - Ensure all 47 tests pass in `bun test`.
