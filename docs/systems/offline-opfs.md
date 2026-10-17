# PWA / Offline Specification

## Purpose
Enable installable, offline-capable Progressive Web App with audio caching, and
replace implicit, always-on audio downloads with an explicit, user-selectable
caching mode that governs the OPFS cache, the Cached collection and offline
playback.

## Requirements

### REQ-PW-001: Service Worker
The system MUST register a service worker for offline asset caching.
- **Tool**: vite-plugin-pwa (Workbox)
- **Strategies**: CacheFirst for static assets, NetworkFirst for API
- **Precache**: All build outputs (JS, CSS, fonts, images)
- **Runtime**: Cache API responses with stale-while-revalidate

### REQ-PW-002: OPFS Audio Caching
The system MUST cache audio streams in Origin Private File System.
- **API**: navigator.storage.getDirectory() → FileSystemDirectoryHandle
- **Trigger**: Configurable — see REQ-CCH-001 (`auto`, `on-demand`, `off`)
- **Format**: Opus/WebM blob
- **Key**: Track ID
- **Artwork**: `<id>.thumb` (16:9) and `<id>.sq.thumb` (square) — see REQ-CCH-008
- **Eviction**: LRU against `config.cacheLimit` (default 500MB)
- **Index**: `library_cached` tracks file presence and doubles as LRU order

### REQ-PW-003: Offline Playback
The system MUST play cached audio when offline.
- **Detection**: navigator.onLine + fetch failure
- **Fallback**: OPFS blob URL → Audio.src
- **Cached collection**: Populated by the active caching mode
- **UI**: "Cached" badge, offline indicator
- **Gating**: skipped entirely in `off` mode — playback streams only

### REQ-PW-004: Install Prompt
The system MUST show install prompt on supported browsers.
- **Event**: beforeinstallprompt
- **UI**: Custom install button/banner
- **Criteria**: Meets PWA installability (manifest, SW, HTTPS)
- **Dismiss**: Remember dismissal, don't spam

### REQ-PW-005: Background Sync
The system MUST queue mutations for background sync.
- **API**: Background Sync API (sw.register.sync)
- **Queue**: Failed syncLibrary calls
- **Trigger**: Online event
- **Retry**: Exponential backoff

### REQ-PW-006: Manifest
The system MUST provide valid Web App Manifest.
- **Fields**: name, short_name, icons, start_url, display, theme_color, background_color
- **Icons**: Generated from source (scripts/generate-icons.ts)
- **Display**: standalone
- **Theme**: Dynamic from current track (future)

### REQ-PW-007: Cache Management
The system MUST provide cache inspection and clearing.
- **UI**: Settings → Storage usage
- **Actions**: Clear audio cache, clear all caches
- **Quota**: navigator.storage.estimate()

## Caching Modes

### REQ-CCH-001: Cache Modes (Setting)
The system MUST expose user-selectable cache behaviour via `config.cachingMode`.
- **auto** (default): a track is cached to OPFS once it has been played
- **on-demand**: playback never caches; the user adds tracks to the Cached collection
- **off**: OPFS is unused, the Cached collection is hidden, and no offline playback happens
- **Persistence**: stored under the `config` localStorage key, validated on load
  (unknown values fall back to `auto`)
- **Limit**: `config.cacheLimit` selects 250 / 500 / 1000 / 2000 MB, default 500 MB
- **Note**: the setting is stored flat, not as a nested `caching.mode` object, because
  `config` hydrates key-by-key and a nested object would need a second special case
  alongside `librarySections`

### REQ-CCH-002: Cached Collection Visibility
The system MUST render the Cached collection exactly once in the library.
- `auto` / `on-demand`: visible, labelled from the reserved collection registry
  with the `ri-thunderstorms-fill` icon
- `off`: absent from the library UI, from the configure modal and from the data
- **Single source of truth**: `getCollectionsKeys()` excludes the `cached` and
  `discovery` pseudo-collections, so they can never also appear as a plain
  user collection
- **Reserved names**: `createCollection` / `renameCollection` reject reserved
  collection names

### REQ-CCH-003: On-Demand Caching
When mode is `on-demand` the system MUST cache only what the user asks for.
- "Add to Collection" offers `Cached` whenever caching is not `off`
- Adding a track writes it to `library_cached` and downloads its audio
- Removing a track deletes its OPFS file
- Playback alone caches nothing

### REQ-CCH-004: Cache Eviction
The system MUST keep the cache within a configurable size limit.
- **Default**: 500 MB, selectable from 250 / 500 / 1000 / 2000 MB
- **Policy**: LRU. `library_cached` is maintained most-recently-used first and
  doubles as the eviction order; a track's position is refreshed when it is
  played from cache
- **Trigger**: after every cache write, and whenever the limit is lowered
- **Side effects**: evicted tracks are dropped from `library_tracks` unless
  another collection still references them
- `off`: OPFS contents and `library_cached` are cleared on the mode change

### REQ-CCH-005: Offline Playback
The system MUST play cached audio without a network round trip.
- `auto` / `on-demand`: `player()` resolves the OPFS blob URL before streaming
- `off`: the cached path is skipped entirely and playback streams only
- The Cached list is locally ordered, so it is neither re-sorted nor paginated

### REQ-CCH-006: Device-Local Data
The Cached collection indexes audio in this device's OPFS and MUST NOT sync.
- `pushFullLibrary`, `pullFullLibrary`, the delta push and the delta apply all
  skip `library_cached`, as does the apply of `deletedCollectionNames`
- `metaUpdater` ignores the `cached` key, so it never marks the library dirty
- Track metadata is still written to `library_tracks` so the Cached list can
  render titles offline
- Sync must additionally leave that track metadata alone on the receiving device —
  see `docs/systems/cloud-sync.md` REQ-CS-011, which is the other half of this
  contract

### REQ-CCH-007: Immediate Mode Application
The system MUST apply a mode or limit change without a reload.
- `setCachingMode` writes the setting, then reconciles state in one pass:
  `off` clears OPFS, empties `library_cached`, and closes an open Cached view
- Lowering `config.cacheLimit` evicts immediately
- `getCachedOpusUrl` is the authoritative runtime gate for `off`

### REQ-CCH-008: Artwork Variants
The system MUST cache the same image the player renders, in the shape it is displayed.
- `- Topic` (music) tracks render square; everything else renders 16:9
- One track id therefore needs two files — `<id>.thumb` and `<id>.sq.thumb`. A
  single file per id cannot satisfy both consumers, and serving a landscape blob
  to a square frame is the defect this requirement exists to prevent
- `generateArtworkUrl(id, music)` is the single source of truth for the player's
  image. The cache writes that exact URL, so the cached blob and the live URL
  cannot drift apart
- `getCachedThumbnailUrl`, `isThumbnailCached` and `cacheTrackThumbnail` are all
  variant-aware. Callers MUST pass the same `music` flag they used to build the
  URL they are about to render
- **Origin of the flag**: the player derives it from `data.author` ending in
  `" - Topic"`; `StreamItem` derives it from its render context. They are
  independent, which is why both variants are stored rather than one guessed at
- Write order: artwork (`maxres`) → `hq` → `mq`, all via the weserv proxy, then a
  direct ytimg fallback for resilience
- Object URLs are memoised by file name, not by track id, so both variants can be
  live in memory at once
- Artwork shares the LRU budget with audio and is evicted with it

### REQ-CCH-009: Cached Collection Lifecycle
The Cached collection and the OPFS directory MUST stay in correspondence.

**1. Removing a track from the Cached collection deletes its audio and both artwork variants.**
- `removeFromCollection` routes removals to `deleteCachedOpus` when the target is
  the `cached` key; that clears `<id>.opus`, both `.thumb` variants, and their
  object URLs
- Membership and file presence share one storage key (`library_cached`), so what
  the list renders is exactly what removal filters against — no second index to
  drift

**2. Cleaning the library clears the OPFS cache.**
- `cleanLibrary` removes every `library*` localStorage key, then awaits
  `clearOpusCache()` before reloading
- OPFS is a separate origin-private filesystem and survives a localStorage wipe.
  Without the explicit clear, the entire cache would be stranded: invisible,
  undeletable from the UI, and held by the origin
- `config` is not a `library*` key, so the caching mode survives and stays
  consistent with a genuinely empty cache

**3. Mutating any other collection leaves the Cached collection untouched.**
- `getReferencedTrackIds()` folds the cached ids into its reference set, so a
  cached track's metadata is never deleted as a side effect of editing an
  unrelated collection
- `removeFromCollection`, `deleteCollection` and `renameCollection` gate every
  OPFS and `library_cached` write on the device-local check
- `markCollectionDeleted` is only reachable from inside that gate, so `cached`
  can never enter `dbsync_dirty_collections`
- Library import and export skip `cached`; it indexes OPFS bytes that never
  travel with the file. Exporting it would populate another device's Cached list
  with entries that have no audio

### REQ-CCH-010: Startup Reconciliation
The system MUST reconcile OPFS against `library_cached` on every launch.
- `getCachedTrackIds()` treats the list as authoritative
- **Dropped**: list entries with no `.opus` file (the list rendering a track the
  cache does not hold)
- **Deleted**: files no list entry vouches for, including thumb-only leftovers.
  Orphan `.opus` files are the ones a wiped or re-synced library strands, and the
  browser would otherwise hold them indefinitely
- **Ordering**: must run after `cleanseLibraryData()`, which can itself strip ids
  from `library_cached` when `library_tracks` has no metadata for them — a state a
  cloud pull produces by rewriting `library_tracks`
- Fire-and-forget: reconciliation never blocks startup
- An `inFlight` set guards ids with a cache write in progress, so reconciliation
  cannot delete a file out from under an in-flight `pipeTo`
- **Consequence, intended**: the list is authoritative and therefore destructive.
  If `library_cached` is lost or truncated while OPFS survives, the next launch
  discards the audio rather than re-adopting it. The audio is re-downloadable;
  the alternative is unreachable storage with no UI to remove it

## Completeness Criteria
| Criterion | Status |
|-----------|--------|
| SW registers and precaches | ⬜ |
| OPFS caches audio on play | ✅ |
| Offline playback works | ✅ |
| Install prompt shows | ⬜ |
| Background sync queues mutations | ⬜ |
| Manifest valid + icons generated | ⬜ |
| Cache management UI works | ⬜ |
| Setting `cachingMode` with 3 options | ✅ |
| Mode change applies immediately | ✅ |
| `off` mode hides Cached collection | ✅ |
| `on-demand` requires explicit add | ✅ |
| Eviction works per mode | ✅ |
| Cached renders exactly once | ✅ |
| Remove Marked works on reserved collections | ✅ |
| Cached never syncs to other devices | ✅ |
| Artwork cached matches the player render (square vs 16:9) | ✅ |
| Remove from Cached deletes audio + both artwork variants | ✅ |
| Clean library clears OPFS | ✅ |
| Other collections leave the Cached collection untouched | ✅ |
| Startup reconciliation prunes orphaned files | ✅ |
| Works on iOS Safari (limited) | ⬜ |
| Integration test offline flow | ⬜ |

Caching criteria are code-verified (typecheck, build, unit tests). The OPFS
paths that need a real browser — eviction, offline playback and the mode switch
side effects — have not been exercised at runtime. Startup reconciliation
(REQ-CCH-010) has likewise only been verified by reading the code paths, not by
observing a real OPFS directory.

## Related Files
- `vite.config.ts` - PWA plugin config
- `src/lib/modules/audioCache.ts` - OPFS audio caching, artwork variants, LRU order, eviction, startup reconciliation + sessionStorage stream metadata cache
- `src/lib/utils/config.ts` - `CachingMode`, `cachingMode`, `cacheLimit`
- `src/lib/utils/image.ts` - `generateArtworkUrl`, the player's image source of truth
- `src/lib/utils/library.ts` - reserved collection registry, mode orchestration
- `src/lib/modules/start.ts` - invokes reconciliation after `cleanseLibraryData`
- `src/lib/modules/cloudSync.ts` - device-local `library_cached` guards
- `src/features/Library/Collections.tsx` - single Cached row
- `src/features/Library/Dropdown.tsx` - clean, import and export; clears OPFS on clean
- `src/features/Library/ConfigureModal.tsx` - Cached section toggle
- `src/features/List/index.tsx` - mark mode removal
- `src/components/ActionsMenu/CollectionSelector.tsx` - on-demand add
- `src/features/Settings/index.tsx` - cache mode and limit UI
- `scripts/generate-icons.ts` - Icon generation
- `public/manifest.webmanifest` - Generated manifest
- `docs/plans/archive/caching-modes.md` - implementation plan and follow-ups

## Non-Goals
- Periodic background sync
- Push notifications
- File System Access API (write to user disk)
- Background sync of the cache
- Cache sharing across devices
- Manual cache management UI (beyond add to collection)
- Cache statistics / storage usage reporting
