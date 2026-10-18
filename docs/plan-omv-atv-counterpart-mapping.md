# Plan: OMV $\leftrightarrow$ ATV Counterpart Mapping & Playlist Song Normalization

**Status:** Ready for Implementation  
**Date:** 2026-10-18  
**Scope:** `CatalogDO.ts`, `catalog.ts`, `catalogClient.ts`, `fixMetadata.ts`, `getPlaylist.ts`, and test suite.

---

## 1. Problem Statement

Playlists on YouTube (including user-created playlists and many official channel playlists) frequently contain Official Music Videos (OMVs) or generic video items rather than official Audio Track Videos (ATVs / Art Tracks).
When loaded in ytify:
- Video items lack square album art (falling back to 16:9 thumbnails).
- Video items lack `albumId` and `albumTitle`.
- Audio playback streams the music video version, which often includes video intros, dialogue, sound effects, or altered arrangements.
- Items are tagged as `type: "video"`.

YouTube Music maintains an internal relationship between OMVs and ATVs (the "Song / Video" switcher). However, ytify's global catalog previously treated tracks in isolation, without recording which video corresponds to which canonical song release.

---

## 2. Goals & Invariants

### 2.1 Goals
1. **Bidirectional OMV $\leftrightarrow$ ATV Mapping**:
   - `canonical_songs` stores `omv_id` referencing the music video.
   - `canonical_videos` stores `atv_id` referencing the canonical song release.
2. **Automatic Population via `fixMetadata`**:
   - When resolving metadata for a video target via YouTube Music search, capture both `target.id` (OMV) and `matchedSong.id` (ATV), establishing the bidirectional link in SQLite.
3. **Playlist Song Substitution (`getPlaylist.ts`)**:
   - For all playlists, attempt YouTube Music retrieval first (`yt.music.getPlaylist`) to receive native ATVs.
   - Batch-query `CatalogDO` for counterpart songs of any remaining `type: "video"` items.
   - Replace matching video items with their canonical song counterpart (`type: "song"`, square `thumbnailId`, `albumId`, `albumTitle`).
4. **Zero Quota Regressions**:
   - Maintain isolate latching and in-memory caches to protect Cloudflare DO SQLite budgets.

### 2.2 Non-Goals
- Real-time blocking resolution for 100+ uncached video items per playlist (unresolved videos remain as `type: "video"` on first view, queuing background resolution).
- Modifying audio caching or OPFS storage formats.

---

## 3. Architecture & Target Design

```
┌────────────────────────────────────────────────────────┐
│                      getPlaylist                       │
│    (Tries yt.music.getPlaylist -> yt.getPlaylist)     │
└───────────────────────────┬────────────────────────────┘
                            │
               Collect all items where type === "video"
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   CatalogDO.counterparts               │
│  SELECT v.id AS omv_id, s.*                            │
│  FROM canonical_videos v                               │
│  JOIN canonical_songs s ON v.atv_id = s.id             │
│  WHERE v.id IN (...)                                   │
└───────────────────────────┬────────────────────────────┘
                            │
              Replace matched items with rich Song data
                            ▼
┌────────────────────────────────────────────────────────┐
│      Unified Playlist with Songs wherever possible     │
└────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps

1. **Schema Update (`src/backend/catalog.ts` & `src/backend/CatalogDO.ts`)**:
   - Add `omvId?: string` and `atvId?: string` to `CanonicalTrack`.
   - Update `initSchema()` in `CatalogDO.ts`:
     - Add `omv_id TEXT` to `canonical_songs`.
     - Add `atv_id TEXT` to `canonical_videos`.
     - Add indices: `idx_videos_atv ON canonical_videos(atv_id)` and `idx_songs_omv ON canonical_songs(omv_id)`.
     - Add schema migration helpers to alter existing tables gracefully.
   - Add `/counterparts` endpoint / method to `CatalogDO` returning mapped `CanonicalTrack` songs for given video IDs.
2. **Client Helper (`src/backend/catalogClient.ts`)**:
   - Export `readSongCounterparts(env, videoIds: string[]): Promise<Record<string, CanonicalTrack>>`.
3. **Metadata Fixer Linking (`src/backend/fixMetadata.ts`)**:
   - In `resolveTrackMetadataViaSearch(target)`:
     - Retrieve `matchedSongId = getVideoId(matchedSong)`.
     - When `matchedSongId !== target.id`:
       - Construct both the `canonical_songs` entry (for `matchedSongId` with `omv_id = target.id`) and the `canonical_videos` entry (for `target.id` with `atv_id = matchedSongId`).
4. **Playlist Normalization (`src/backend/getPlaylist.ts`)**:
   - Update playlist fetcher to attempt `yt.music.getPlaylist(id)` for `PL...` playlists before falling back to `yt.getPlaylist(id)`.
   - Query `readSongCounterparts` for any items where `type === "video"`.
   - Replace matched video items with canonical song metadata (`id`, `title`, `author`, `authorId`, `duration`, `subtext`, `albumId`, `albumTitle`, `img`, `type: "song"`).
5. **Testing & Verification**:
   - Add unit tests in `scripts/catalog.test.ts` for schema migration, counterpart linking, and `/counterparts` queries.
   - Verify all tests pass with `bun test`.
   - Validate TypeScript compilation with `npx tsc --noEmit`.
