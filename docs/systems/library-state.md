# Library Collections & State Specification

## Purpose

Provide a flexible, user-managed library of tracks organized into collections with cloud sync, URL parameter-driven view routing, and consolidated editorial/artist shelves.

---

## Requirements

### REQ-LC-001: Built-in Collections

The system MUST provide 10 built-in collections with specific behaviors.

| Collection  | Source                        | Behavior                       |
| ----------- | ----------------------------- | ------------------------------ |
| history     | Auto on play (config.history) | Prepend, max 1000              |
| favorites   | User action                   | Prepend                        |
| liked       | YouTube "Liked" sync          | Prepend                        |
| listenLater | User action                   | Append                         |
| channels    | Subscriptions                 | Channel objects                |
| playlists   | YouTube playlists             | Playlist objects               |
| albums      | Saved albums                  | Album objects                  |
| cached      | Cache mode `auto`/`on-demand` | OPFS-backed, LRU, device-local |
| discovery   | "For You" algorithm           | Frequency-ranked, virtual      |
| custom      | User created                  | Append                         |

`cached` and `discovery` are pseudo-collections: they are excluded from
`getCollectionsKeys()` and render from their own entries. See
`docs/systems/offline-opfs.md` (REQ-CCH-002).

### REQ-LC-002: Collection CRUD

The system MUST support full CRUD for custom collections.

- **Create**: Unique name validation
- **Read**: `getCollection(name) -> string[]`
- **Update**: `addToCollection`, `removeFromCollection`
- **Delete**: `deleteCollection` (cleans orphan tracks)
- **Rename**: `renameCollection` (updates references)

### REQ-LC-003: Track Management

The system MUST manage track references across collections.

- **Deduplication**: Single track object in `library_tracks`, referenced by ID
- **Reference counting**: Track deleted only when no collection references it
- **Modified timestamp**: Updated on every add/remove
- **Sync trigger**: `metaUpdater` calls `scheduleSync()`

### REQ-LC-004: Sorting & Pagination

The system MUST support configurable sorting and pagination.

- **Sort by**: `modified`, `name`, `artist`, `duration`
- **Sort order**: `asc`, `desc`
- **Reserved collections**: `history`, `favorites`, `liked`, `listenLater` always use `modified desc`
- **Pagination**: 20 items/page, `IntersectionObserver` for more

### REQ-LC-005: Shared Collections

The system MUST support sharing collections via short ID.

- **Generate**: Short ID (`ss/` endpoint)
- **Access**: `/ss/{id}` -> fetches shared data
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

- **Add track**: `syncLibrary("add", id)`
- **Remove track**: `syncLibrary("remove", id)`
- **Collection change**: `metaUpdater(name)` -> `scheduleSync()`
- **Dirty tracking**: `dbsync_dirty_tracks`, `dbsync_dirty_collections`

### REQ-LC-008: URL Routing & Navigation Flag

The Library view is controlled by a URL boolean flag:

- **Flag Format**: Pure boolean query flag `?library` (never with `=`).
- **Activation**: Presenting `?library` in the URL mounts the Library feature view.
- **Navigation Cleanup**: Whenever the user navigates away from the Library (such as entering search, clicking search suggestions, or navigating to another page/view), `library` is strictly stripped from URL query parameters via `url.searchParams.delete("library")` to prevent invalid hybrid states (e.g. `/search?q=foo&library`).

### REQ-LC-009: Library Shelves & Modularity

The Library view exposes modular shelves toggled in `config.librarySections`:

- **Active Shelves**:
  - `pinned`: Pinned collection quick chips.
  - `history`: Horizontal carousel of recently played tracks.
  - `featured`: Consolidated recommendations shelf (`Featured.tsx`).
  - `playlists`: User-saved and created playlists.
  - `albums`: Saved albums.
  - `artists`: Subscribed channel list.
- **Retired Shelves**: The legacy `Gallery.tsx` view and `gallery` config toggle have been completely removed.

### REQ-LC-010: Featured Shelf Consolidation & Favorites Coupling

- **Unified `/api/featured` Backend**:
  - Populates both **Featured Playlists** (Moods & Genres official + artist `Featured on` playlists) and **Community Playlists** in a single network round-trip.
  - Both the Library hub and the Favorites artist carousel share `rankFavoriteArtists()` (`src/utils.ts`): favorites-only, at least two tracks per artist, top 10 in collection order. The same ordered artist IDs are sent to `/api/featured`.
- **Favorites Shelf Coupling**:
  - The Artist carousel is a lazily imported component (`src/features/List/ArtistCarousel.tsx`) rendered by `src/features/List/index.tsx` only for the `favorites` collection.
  - It is strictly coupled to `config.librarySections().featured`. When that is false or toggled off, the carousel is unmounted and all artist channel network queries are skipped.

---

## Completeness Criteria

| Criterion                                                      | Status |
| -------------------------------------------------------------- | ------ |
| All 10 built-in collections work                               | ✅     |
| Custom CRUD operations work                                    | ✅     |
| Track deduplication correct                                    | ✅     |
| Reference counting cleans orphans                              | ✅     |
| All 4 sort criteria work                                       | ✅     |
| Pagination loads 20 at a time                                  | ✅     |
| Shared collections accessible                                  | ✅     |
| Cleansing removes orphans                                      | ✅     |
| All mutations trigger sync                                     | ✅     |
| Pure `?library` flag navigation & search cleanup               | ✅     |
| Favorites artist shelf coupled to `librarySections().featured` | ✅     |
| Consolidated `/api/featured` shelf                             | ✅     |
| Unit tests for library.ts utils                                | ✅     |

---

## Related Files

- `src/modules/library.ts` - Core library logic
- `src/features/Library/` - UI components
- `src/features/Library/Featured.tsx` - Consolidated featured shelf
- `src/features/List/index.tsx` - Favorites collection & coupled Artist carousel
- `src/modules/cloudSync.ts` - Sync integration
- `src/modules/audioCache.ts` - OPFS-backed `cached` collection

## Non-Goals

- Smart collections (auto-rules)
- Collection folders/hierarchy
- Collaborative collections
