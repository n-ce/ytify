# Cloud Sync Specification

## Purpose
Enable seamless, conflict-resilient synchronization of user library across devices using Cloudflare Durable Objects.

## Requirements

### REQ-CS-001: Per-User Durable Object
The system MUST isolate each user's data in a separate Durable Object.
- **Identity**: SHA-256(email|password) → 64-char hex
- **DO ID**: idFromName(userHash)
- **Storage**: SQLite via DO storage.sql
- **Schema**: meta, tracks, collections, deleted_tracks, deleted_collections

### REQ-CS-002: Authentication
The system MUST authenticate via SHA-256 hash (no plaintext passwords).
- **Endpoint**: `/api/syncHash` (POST email, password)
- **Response**: 64-char hex hash
- **Client**: Stores hash as dbsync config
- **Security**: Hash never sent to server except for DO routing

### REQ-CS-003: Delta Sync Protocol
The system MUST synchronize changes via delta payloads.
- **Pull**: POST /api/sync/{userHash} with local meta → returns delta
- **Push**: PUT /api/sync/{userHash} with delta payload
- **Delta payload**: meta, addedOrUpdatedTracks, deletedTrackIds, updatedCollections, deletedCollectionNames
- **Conflict resolution**: Last-write-wins per collection (timestamp), union merge on initial sync

### REQ-CS-004: Initial Full Sync
The system MUST handle first-time sync for new users.
- **Detection**: localStorage.dbsync_account !== userHash
- **Flow**: Pull returns 404 → pushFullLibrary() → mark synced
- **Local meta**: { version: 5, tracks: 0 } for initial

### REQ-CS-005: Dirty Tracking
The system MUST track local changes for efficient push.
- **Tracks**: dbsync_dirty_tracks { added: [], deleted: [] }
- **Collections**: dbsync_dirty_collections { deleted: [] }
- **Trigger**: addToCollection, removeFromCollection, deleteCollection
- **Clear**: On successful push, clear pushed items

### REQ-CS-006: Auto Sync
The system MUST sync automatically on visibility/focus.
- **Trigger**: document.visibilitychange + window.focus
- **Debounce**: 30 seconds since last sync
- **Config**: Only when config.dbsync is set
- **Queue**: Sync queued if already in progress

### REQ-CS-007: Sync State UI
The system MUST expose sync status to UI.
- **States**: synced, syncing, dirty, error
- **Display**: Settings panel + subtle indicator
- **Messages**: Localized (sync_up_to_date, sync_changes_synced, sync_failed)

### REQ-CS-008: Server-Side Delta Computation
The DO MUST compute deltas efficiently using timestamps.
- **Meta comparison**: Server meta vs client meta per key
- **Tracks**: Modified > clientMeta.tracks
- **Collections**: Modified > clientMeta[collectionName]
- **Deleted items**: deleted_at > clientMeta.tracks (tracks) or clientMeta[collectionName]

### REQ-CS-009: TTL Cleanup
The system MUST clean up old deleted records.
- **Tracks**: Deleted > 30 days
- **Collections**: Deleted > 30 days
- **DO lifecycle**: Alarm at 30 days, delete DO after 100 days inactivity
- **Trigger**: DO alarm() method

### REQ-CS-010: Retry Logic
The system MUST retry on transient failures.
- **Status codes**: 502, 503, 504
- **Backoff**: Exponential (1s, 2s, 4s)
- **Max retries**: 3
- **Queue**: Sync re-queued after retry

### REQ-CS-011: Cached Collection Isolation
Cloud sync MUST NOT transfer the Cached collection, and MUST NOT destroy the track
metadata that collection depends on.

- **The key is guarded**: `library_cached` is skipped by `pushFullLibrary`,
  `pullFullLibrary`, the delta push comparison, the delta apply for
  `updatedCollections`, and — since a server payload is untrusted input — the
  apply for `deletedCollectionNames`
- **Track metadata is the load-bearing part.** Those guards protect the `cached`
  key, but the cache also depends on `library_tracks` entries, which arrive
  separately and in cleartext through `addedOrUpdatedTracks` / `deletedTrackIds`.
  Guarding only the key is not sufficient
- **Failure this prevents**, across two devices:
  1. Device A removes track X from its last synced collection. A has no cache
     entry for X, so X is unreferenced and A pushes `deletedTrackIds: ["X"]`
  2. Device B has X cached only — audio in OPFS, in no synced collection
  3. B's `applyDelta` dropped X's metadata from `library_tracks`
  4. On B's next launch `cleanseLibraryData` stripped X from `library_cached`
  5. The startup reconcile then deleted X's `.opus` and `.thumb`
  
  A collection edit on one device silently destroyed another device's audio cache
- **Guard**: `applyDelta` exempts ids in this device's cached list from both
  remote deletes and pending local ones. The pending-delete branch needs it too —
  a delete marked before the track was cached is still sitting in
  `dirtyTracks.deleted` and would otherwise fire on the next full sync
- **Not excluded**: track metadata for cached tracks is still written to
  `library_tracks` (so the Cached list can render titles offline) and is still
  pushed. A track's cached copy cannot be separated from its synced copy at the
  `library_tracks` level; the other device simply drops the entry as unreferenced
  on its own `cleanseLibraryData` pass

## Completeness Criteria
| Criterion | Status |
|-----------|--------|
| SHA-256 auth produces consistent ID | ⬜ |
| DO isolates per user correctly | ⬜ |
| Delta sync pulls remote changes | ⬜ |
| Delta sync pushes local changes | ⬜ |
| Conflict resolution: LWW works | ⬜ |
| Initial full sync for new users | ⬜ |
| Dirty tracking captures all changes | ⬜ |
| Auto-sync on focus/visibility | ⬜ |
| Sync state UI updates correctly | ⬜ |
| TTL cleanup runs on alarm | ⬜ |
| Retry with exponential backoff | ⬜ |
| Remote collection delete never clears `library_cached` | ✅ |
| Remote track delete preserves cached-track metadata | ✅ |
| Unit tests for applyDelta logic | ⬜ |
| Integration test with real DO | ⬜ |

REQ-CS-011 is code-verified only (typecheck, build). The cross-device scenario it
guards has not been reproduced against a live Durable Object.

---

## Global Catalog Write-Through

Per-user DOs are not a metadata store. Every track that reaches the database is
projected into the shared global catalog so repairs and previews are computed
once for everybody.

### REQ-CS-012: Track Normalisation on Ingest
Any track written by a user MUST be projected into the global catalog.
- **Applies to**: delta pushes (`addedOrUpdatedTracks`) and full library PUTs
- **Timing**: `ctx.waitUntil`, so sync latency is unaffected by a catalog write
- **Source tag**: `user_sync`
- **Failure handling**: a catalog failure is logged and swallowed — the user's
  own record is already committed and must never be rolled back
- **Retired**: the per-user `track_metadata_fix` table and its `metadata-fix`
  routes. Replacements live in `CatalogDO`; see `docs/systems/catalog.md`
  REQ-CAT-002 and `src/backend/fixMetadata.ts`

### REQ-CS-013: Relational Library View
The user's ownership of a track MUST be stored independently of its metadata.
- `user_tracks (track_id, added_at, play_count, custom_data)` is that view;
  legacy rows are backfilled on first access, so no library needs a reset
- Membership (and therefore `GET /library` output) is driven by `user_tracks`
- Metadata comes from the catalog, with the local JSON snapshot as fallback for
  offline rendering and for catalog misses — see REQ-CAT-003b in
  `docs/systems/catalog.md` for the hydration and isolation rules

The snapshot row is still written in full on purpose: the library has to render
offline, and a `library_tracks` entry is the only thing that can survive a
network outage. What changed is which copy is authoritative.

## Related Files
- `src/lib/modules/cloudSync.ts` - Client sync logic, device-local guards
- `src/lib/modules/audioCache.ts` - `getCachedTrackIdsSync`, the source of the
  exempt set in `applyDelta`
- `src/backend/UserSyncDO.ts` - Server DO logic
- `src/backend/worker.ts` - Worker routing
- `src/lib/utils/library.ts` - syncLibrary integration
- `src/lib/stores/app.ts` - config.dbsync
- `docs/systems/offline-opfs.md` - REQ-CCH-006, REQ-CCH-010 (the other half of
  this contract)

## Non-Goals
- Real-time sync (WebSocket)
- Selective sync (folder-level)
- Conflict UI (manual resolution)
- End-to-end encryption