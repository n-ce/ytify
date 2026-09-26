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
| Unit tests for applyDelta logic | ⬜ |
| Integration test with real DO | ⬜ |

## Related Files
- `src/lib/modules/cloudSync.ts` - Client sync logic
- `src/backend/UserSyncDO.ts` - Server DO logic
- `src/backend/worker.ts` - Worker routing
- `src/lib/utils/library.ts` - syncLibrary integration
- `src/lib/stores/app.ts` - config.dbsync

## Non-Goals
- Real-time sync (WebSocket)
- Selective sync (folder-level)
- Conflict UI (manual resolution)
- End-to-end encryption