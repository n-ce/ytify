# Plan: New Caching Spec

**Status:** Completed
**Date:** 2026-09-26

## Goal
Replace downloads with configurable caching modes, specified in
`docs/systems/offline-opfs.md` (REQ-CCH-001 … REQ-CCH-007).

**Status: implemented.** The requirements live in `docs/systems/offline-opfs.md`.
The setting is stored flat as `config.cachingMode` (plus `config.cacheLimit`)
because `config` hydrates key-by-key; a nested `caching.mode` object would need a
second special case alongside `librarySections`.

## Requirements

### REQ-CCH-001: Cache Modes (Setting)
User-selectable cache behavior via setting `config.cachingMode`:
- **auto** (default): Play → cache to OPFS (current behavior)
- **on-demand**: Play does NOT cache; user must explicitly "Add to Cache" collection
- **off**: No caching; OPFS not used; "Cached" collection hidden from library

### REQ-CCH-002: Cached Collection Visibility
- `auto` / `on-demand`: "Cached" collection visible in library
- `off`: "Cached" collection removed from library UI and data

### REQ-CCH-003: On-Demand Caching
When mode = `on-demand`:
- "Add to collection" selector includes "Cached" option
- User explicitly adds track → cached to OPFS
- No automatic caching on play

### REQ-CCH-004: Cache Eviction
- LRU eviction with configurable size limit (default 500MB)
- Applies to `auto` and `on-demand` modes
- `off` mode: OPFS cleared on mode change

### REQ-CCH-005: Offline Playback
- Cached tracks play offline in `auto` and `on-demand` modes
- `off` mode: no offline playback (stream only)

## Completeness Criteria
| Criterion | Status |
|-----------|--------|
| Setting `caching.mode` with 3 options | ✅ |
| Mode change applies immediately | ✅ |
| `off` mode hides Cached collection | ✅ |
| `on-demand` requires explicit add | ✅ |
| `auto` caches on play | ✅ |
| Eviction works per mode | ✅ |
| Offline playback works | ✅ |

## Related Files
- `src/lib/modules/audioCache.ts`
- `src/lib/utils/config.ts` (new setting)
- `src/lib/utils/library.ts` (cached collection)
- `src/features/Library/` (collection visibility)
- `src/features/Settings/` (cache mode UI)
- `src/lib/modules/cloudSync.ts` (keeps `library_cached` device-local)

## Non-Goals
- Background sync of cache
- Cache sharing across devices
- Manual cache management UI (beyond add to collection)

## Follow-up: library bugs found while implementing
- [x] "Cached" rendered twice, once as a reserved collection and once as a plain
      collection. `getCollectionsKeys()` now excludes the `cached` / `discovery`
      pseudo-collections.
- [x] "Remove Marked" was hidden on reserved collections because `cached` was
      flagged `isShared`. `isShared` now means "remote shared collection" only.
- [x] `pushFullLibrary` / `pullFullLibrary` swept `library_cached` across devices,
      which would have wiped the local OPFS index on every sync. All four sync
      paths now skip it (REQ-CCH-006).

## Out of scope, not blocking
`list_delete` / "Clear all" on the Cached list renders with no click handler
(`src/features/List/Dropdown.tsx`). This is pre-existing, unrelated to the
caching modes, and manual cache management is an explicit non-goal — worth a
separate plan if it ever needs wiring up.
