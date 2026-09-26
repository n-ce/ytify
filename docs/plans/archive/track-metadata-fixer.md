# Track Metadata Fixer Specification & Implementation Plan

**Date**: 2026-09-26  
**Status**: Completed & Archived  
**Priority**: High  
**Scope**: Client-side library self-healing & Backend metadata resolution service  

---

## 1. Problem Statement & Key Constraints

Many music releases on YouTube/YouTube Music are automated uploads (Art Tracks) delivered by digital distributors (DistroKid, TuneCore, Believe, CDBaby, etc.).

### Critical Findings & Constraints
1. **The `authorId` is NOT a fixed, shared ID**: YouTube creates unique, ephemeral, or pseudo-channel IDs for different automated releases under the "Release - Topic" banner.
2. **The channel is completely empty**: When navigating to any of those `authorId` channels in ytify or YouTube, it loads an empty channel page titled "Release - Topic" with zero browseable tracks.
3. **`getInfo` Method is Heavily Restricted**: Direct `getInfo` and `music.getInfo` calls are heavily bot-detected, throttled, or blocked by YouTube's player integrity checks (cipher/poToken requirements) on cloud/datacenter IPs.
4. **Resolution via YouTube Music Search Songs API**: We **must use the YouTube Music Search Songs API** (`yt.music.search(query, { type: 'song' })`). This endpoint is unrestricted, fast, does not require player ciphers, and reliably returns clean `MusicResponsiveListItem` nodes with the true artist name and true artist channel ID.
5. **Key Resolution Strategy**:
   - Store strictly by `trackId` (Video ID).
   - Backend queries YouTube Music Search for songs using the track title.
   - Matches the exact `videoId` (via `getVideoId(song)`) in the search shelf.
   - Extracts the true `author` (`song.artists[0].name`) and real `authorId` (`song.artists[0].channel_id`).
   - Fixes both fields so the UI displays the real artist and clicking "Artist" opens the real artist's page.

---

## 2. Intent Verification & Requirement Mapping

| User Requirement / Constraint | Implementation Mechanism | Status |
| :--- | :--- | :---: |
| **Fix tracks with author "Release - Topic"** | Detect tracks where `author === "Release - Topic"` or cleaned `author === "Release"` | ✅ Completed |
| **Fix both locally & backend separately** | `src/lib/modules/metadataFixer.ts` (client) + `src/backend/fixMetadata.ts` (backend) | ✅ Completed |
| **No `getInfo`; use Music Search Songs API** | Query `yt.music.search(title, { type: 'song' })` to avoid player/bot restrictions | ✅ Completed |
| **Client fixer module on every start** | Asynchronous call in `src/lib/modules/start.ts` right after `cleanseLibraryData()` | ✅ Completed |
| **First check locally if other tracks with same `authorId` have valid author** | Local `validAuthorByAuthorId` map checked first before network calls | ✅ Completed |
| **If not available, call backend fixer API** | Batch request `POST /api/fix-metadata` with `[{ id, title }]` | ✅ Completed |
| **Backend store to persist corrected metadata** | Durable Object SQLite table / KV store keyed by `track_id` | ✅ Completed |
| **Store index: `authorId` vs `trackId`** | Confirmed: `trackId` as primary key (dummy `authorId`s are unique & dead) | ✅ Completed |

---

## 3. Backend Architecture: YouTube Music Search Resolution Engine

```
                             Client Request
                   POST /api/fix-metadata { tracks: [{ id, title }] }
                                   │
                                   ▼
               ┌───────────────────────────────────────┐
               │ Check Backend Cache (SQLite / KV)     │
               │ SELECT * FROM track_metadata_fix      │
               │ WHERE track_id = ?                    │
               └───────────────────┬───────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                 (Hit)                         (Miss)
                    │                             │
                    ▼                             ▼
             Return cached metadata        [Music Search Songs Pipeline]
                                           yt.music.search(track.title, { type: 'song' })
                                                  │
                                                  ▼
                                           [Scan results.songs.contents]
                                           1. Primary Match:
                                              getVideoId(song) === track.id
                                           2. Secondary Match (if ID differs):
                                              Title similarity + duration match
                                                  │
                                                  ▼
                                           Extract true metadata:
                                           - author: song.artists[0].name
                                           - authorId: song.artists[0].channel_id
                                           - title: song.title
                                                  │
                                                  ▼
                                           [Upsert into track_metadata_fix]
                                                  │
                                                  ▼
                                           [Return JSON Response]
```

### 3.1 Resolving via `yt.music.search` (`src/backend/fixMetadata.ts`)
- Cleans the track title query.
- Queries `yt.music.search(query, { type: 'song' })`.
- Matches exact video ID in results, or falls back to the top non-corrupted music song.
- Extracts `author` and `authorId`.

### 3.2 Persistent Backend Cache Schema
- Implemented in `UserSyncDO.ts`:
  ```sql
  CREATE TABLE IF NOT EXISTS track_metadata_fix (
    track_id TEXT PRIMARY KEY,
    author TEXT NOT NULL,
    author_id TEXT,
    title TEXT,
    updated_at REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_metadata_fix_updated ON track_metadata_fix(updated_at);
  ```

### 3.3 API Route Specification
- Mounted in `src/backend/worker.ts` at `/fix-metadata`.
- Accepts both `POST /fix-metadata` with `{ tracks: [{ id, title }] }` and `GET /fix-metadata?id=...`.

---

## 4. Client-Side Self-Healing Module (`src/lib/modules/metadataFixer.ts`)
- **Stage 1**: Checks `library_tracks` for valid authors sharing the same `authorId`.
- **Stage 2**: Dispatches batch requests to `store.api + "/fix-metadata"`.
- Updates `library_tracks`, triggers reactive `libraryUpdated` counter, and schedules sync if `config.dbsync` is active.
- Startup trigger mounted in `src/lib/modules/start.ts`.
- Dynamic on-the-fly fix mounted in `src/lib/utils/player.ts` inside `applyMetadata`.

---

## 5. Implementation Roadmap Status

- [x] **Step 1: Backend Resolver (`src/backend/fixMetadata.ts`)**
- [x] **Step 2: Backend Route Integration (`src/backend/worker.ts`)**
- [x] **Step 3: Client Fixer Module (`src/lib/modules/metadataFixer.ts`)**
- [x] **Step 4: Startup Hook (`src/lib/modules/start.ts`)**
- [x] **Step 5: End-to-End Verification & Build Passing**
