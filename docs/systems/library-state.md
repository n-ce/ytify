# Library Collections Specification

## Purpose
Provide a flexible, user-managed library of tracks organized into collections with cloud sync.

## Requirements

### REQ-LC-001: Built-in Collections
The system MUST provide 10 built-in collections with specific behaviors.
| Collection | Source | Behavior |
|------------|--------|----------|
| history | Auto on play (config.history) | Prepend, max 1000 |
| favorites | User action | Prepend |
| liked | YouTube "Liked" sync | Prepend |
| listenLater | User action | Append |
| channels | Subscriptions | Channel objects |
| playlists | YouTube playlists | Playlist objects |
| albums | Saved albums | Album objects |
| cached | Cache mode `auto`/`on-demand` | OPFS-backed, LRU, device-local |
| discovery | "For You" algorithm | Frequency-ranked, virtual |
| custom | User created | Append |

`cached` and `discovery` are pseudo-collections: they are excluded from
`getCollectionsKeys()` and render from their own entries. See
`docs/systems/offline-opfs.md` (REQ-CCH-002).

### REQ-LC-002: Collection CRUD
The system MUST support full CRUD for custom collections.
- **Create**: Unique name validation
- **Read**: getCollection(name) → string[]
- **Update**: addToCollection, removeFromCollection
- **Delete**: deleteCollection (cleans orphan tracks)
- **Rename**: renameCollection (updates references)

### REQ-LC-003: Track Management
The system MUST manage track references across collections.
- **Deduplication**: Single track object in library_tracks, referenced by ID
- **Reference counting**: Track deleted only when no collection references it
- **Modified timestamp**: Updated on every add/remove
- **Sync trigger**: metaUpdater calls scheduleSync()

### REQ-LC-004: Sorting & Pagination
The system MUST support configurable sorting and pagination.
- **Sort by**: modified, name, artist, duration
- **Sort order**: asc, desc
- **Reserved collections**: history/favorites/liked/listenLater always use modified desc
- **Pagination**: 20 items/page, IntersectionObserver for more

### REQ-LC-005: Shared Collections
The system MUST support sharing collections via short ID.
- **Generate**: Short ID (ss/ endpoint)
- **Access**: /ss/{id} → fetches shared data
- **Display**: Read-only view with "Save to library" option
- **Expiry**: Not implemented (future)

### REQ-LC-006: Library Cleansing
The system MUST provide maintenance operations.
- **Orphan tracks**: Remove tracks not in any collection
- **Invalid refs**: Remove collection entries pointing to missing tracks
- **Schema cleanup**: Strip extra properties from track objects
- **Deprecated keys**: Remove legacy `frequently_played` and V1 `library` blob data
- **Trigger**: Manual (dev tools) or on version bump

### REQ-LC-007: Cloud Sync Integration
The system MUST integrate with cloud sync for all mutations.
- **Add track**: syncLibrary("add", id)
- **Remove track**: syncLibrary("remove", id)
- **Collection change**: metaUpdater(name) → scheduleSync()
- **Dirty tracking**: dbsync_dirty_tracks, dbsync_dirty_collections

## Completeness Criteria
| Criterion | Status |
|-----------|--------|
| All 10 built-in collections work | ⬜ |
| Custom CRUD operations work | ⬜ |
| Track deduplication correct | ⬜ |
| Reference counting cleans orphans | ⬜ |
| All 4 sort criteria work | ⬜ |
| Pagination loads 20 at a time | ⬜ |
| Shared collections accessible | ⬜ |
| Cleansing removes orphans | ⬜ |
| All mutations trigger sync | ⬜ |
| Unit tests for library.ts utils | ⬜ |

## Related Files
- `src/lib/utils/library.ts` - Core library logic
- `src/features/Library/` - UI components
- `src/lib/modules/cloudSync.ts` - Sync integration
- `src/lib/modules/audioCache.ts` - OPFS-backed `cached` collection

## Non-Goals
- Smart collections (auto-rules)
- Collection folders/hierarchy
- Collaborative collections