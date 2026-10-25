# Global Normalized Catalog Specification

## Purpose

Provide a normalized, deduplicated, single-source-of-truth record of every track ytify has resolved, so metadata repairs, user sync, link previews, and recommendations read from the same store while strictly adhering to Cloudflare Durable Object SQLite write limits (100,000 writes/day).

---

## Architecture & Requirements

### REQ-CAT-001: Two-Table Specialized Schema

The catalog lives in one global Cloudflare Durable Object (`CatalogDO`, DO name `global`) and partitions entities into two distinct, optimized SQLite tables:

```
                               Incoming Track Input
                      (Search, Artist Load, Playback, Sync)
                                       │
                      Is it an Audio Track Video (ATV)
                         or "- Topic" release?
                                  /         \
                             YES /           \ NO
                                /             \
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

1. **`canonical_songs`**:
   - Official music releases ("- Topic", ATVs).
   - Stores `album_id`, `album_title`, and square release cover art `thumbnail_id`.
   - Artist names are sanitized to clean artist names without the trailing `" - Topic"`.
2. **`canonical_videos`**:
   - Generic videos without release albums (podcasts, live clips, official music videos, UGC).
   - **`thumbnail_id` is omitted**: Video thumbnails follow deterministic YouTube CDN URLs (`https://i.ytimg.com/vi/<id>/mqdefault.jpg`) and need no database storage.
3. **Relational Indexing**:
   - `categories`: Curated Moods & Genres categories.
   - `curated_playlists`: Curated playlists referencing `section_title` ("Featured playlists" vs "Community playlists").
   - `playlist_tracks`: Relational join index mapping `playlist_id` to `track_id` with ordering preserved.

### REQ-CAT-002: Catalog Write-Through & Isolate Latching

Every resolution path writes through to the catalog, protected by in-memory rate latches:

- **Isolate Latching (`ISOLATE_LATCH`)**:
  `catalogClient.ts` maintains an in-memory 60-second lease map of recently written track IDs per worker isolate. Repeated requests for the same track within the TTL window bypass SQLite write calls entirely, preventing duplicate write exhaustion against Cloudflare DO quotas.
- `fixMetadata`: Writes `fix_metadata` records with resolved square cover art, `albumId`, and `albumTitle`.
- `UserSyncDO`: Projects delta tracks and full library PUTs as `user_sync` records via `ctx.waitUntil`.
- The link-preview path writes oEmbed results back on a catalog miss.

### REQ-CAT-003: Merge Semantics

Writes MUST NOT regress a record:

- `updated_at >= stored.updated_at` gates every overwrite.
- A write with `duration = 0` (e.g., lightweight metadata repair) MUST preserve the stored duration and duration string.
- A write with an empty `thumbnail_id` MUST preserve the stored thumbnail.
- A richer scrape record never gets clobbered by a partial update.

### REQ-CAT-003b: Repair Propagation & Hydration

A catalog fix MUST reach every user without a manual library reset:

- `UserSyncDO.user_tracks` holds the relational view of a library (track ID, `added_at`, `play_count`, `custom_data`); JSON snapshot rows are retained as an offline/fallback copy.
- Reads call `overlayCanonical` in `UserSyncDO`, hydrating `img`, `albumId`, and `albumTitle` onto the local snapshot while keeping client-specific fields (e.g. `context`).
- A delta pull queries `/tracks-since` to deliver canonical updates for tracks the user owns.

### REQ-CAT-004: Consolidated `/featured` Route

Replaces the legacy `/recommend` and retired `Gallery` endpoints with a single unified orchestrator in `src/backend/getFeatured.ts`:

- **Input**:
  - `ids`: Up to 25 history track IDs.
  - `artistIds`: Up to 5 favorite artist IDs (from tracks with `- Topic`).
  - `limit`: Optional max items per shelf (default 20, max 30).
- **Parallel Retrieval**:
  1. `ytmgr`: External recommendation service returning "Featured playlists" and "Community playlists" matched by history track overlap.
  2. `yt.music.getArtist`: In parallel for each favorite artist ID, extracting artist `Featured on` playlists and resolving real channel avatars from `MusicImmersiveHeader` / `MusicVisualHeader`.
- **Response**:
  ```typescript
  interface FeaturedResult {
    featuredPlaylists: YTPlaylistItem[];
    communityPlaylists: YTPlaylistItem[];
    artists: Channel[];
  }
  ```

### REQ-CAT-005: Local Dev Parity (`localAdapter.ts`)

- In local Vite development mode, `src/backend/localAdapter.ts` handles API routes directly via Vite middleware.
- Provides an async background task runner for `ctx.waitUntil` tasks, matching Cloudflare Workers runtime behavior.

---

## Completeness Criteria

| Criterion                                                  | Status |
| ---------------------------------------------------------- | ------ |
| Two-table schema (`canonical_songs` vs `canonical_videos`) | ✅     |
| Video thumbnail IDs omitted (derived client-side)          | ✅     |
| Isolate latching prevents redundant SQLite writes          | ✅     |
| Metadata repair writes albumId and albumTitle through      | ✅     |
| User sync hydrates canonical metadata (`overlayCanonical`) | ✅     |
| Consolidated `/featured` endpoint with artist resolution   | ✅     |
| Local Vite adapter supports async `ctx.waitUntil`          | ✅     |
