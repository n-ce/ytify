# Code Quality Fix Plan

**Date**: 2026-09-26  
**Priority**: High  
**Scope**: Fix inconsistencies and issues introduced in recent refactoring

---

## Summary

Recent changes introduced significant code reorganization (moving OPFS/stream cache to modules, consolidating player metadata/audio logic) but left behind:
- Duplicate implementations
- Inconsistent formatting
- Dead code
- Import/export mismatches
- Type safety gaps
- Reactivity concerns

---

## Issues by Category

### 1. Code Duplication & Dead Code (Critical)

| File | Issue | Action |
|------|-------|--------|
| `src/lib/modules/setMetadata.ts` | Likely unused - `applyMetadata` moved to `player.ts` | Verify usage, delete if unused |
| `src/lib/modules/setAudioStreams.ts` | Likely unused - `applyAudioStreams` moved to `player.ts` | Verify usage, delete if unused |
| `src/lib/utils/helpers.ts` | Lines 1-111 removed functions now in `core.ts` with different impl | Remove duplicate `parseDuration`, `convertSStoHHMMSS`, `shuffle`, `idFromURL` from helpers |
| `src/lib/utils/opfsCache.ts` | **DELETED** but logic duplicated in `audioCache.ts` | Confirm `audioCache.ts` is complete replacement |
| `src/lib/utils/streamCache.ts` | **DELETED** but logic duplicated in `audioCache.ts:328-355` | Confirm `audioCache.ts` is complete replacement |

### 2. Import/Export Mismatches (Critical)

| File | Issue | Action |
|------|-------|--------|
| `src/lib/utils/index.ts` | Removed `streamCache` and `opfsCache` exports | Verify all consumers updated to `@modules/audioCache` |
| `src/lib/stores/player.ts` | Imports `streamCache` from `@modules/audioCache` | Verify `audioCache.ts` exports `streamCache` (it does at line 328) |
| `src/lib/utils/helpers.ts` | `idFromURL` removed but may be used elsewhere | Search codebase for `idFromURL` usage, restore export if needed |
| `src/lib/utils/player.ts` | Imports `getCachedOpusUrl`, `streamCache` from `@modules/audioCache` | Verify exports exist in `audioCache.ts` |

### 3. Formatting Inconsistencies (High)

| File | Issue | Action |
|------|-------|--------|
| `src/styles/patterns.css` | 290 lines reformatted from compact to expanded style | Pick one style, apply consistently across all CSS |
| `src/lib/utils/helpers.ts` | Mixed compact/expanded function formatting | Standardize on project convention |
| `src/lib/utils/config.ts` | New exports use different spacing than existing | Align with existing export style |
| `src/lib/stores/queue.ts` | Import formatting changed (multi-line vs single-line) | Standardize import style |

### 4. Type Safety Gaps (High)

| File | Issue | Action |
|------|-------|--------|
| `src/lib/utils/config.ts:71` | `config.cacheLimit: number = DEFAULT_CACHE_LIMIT_MB` but `DEFAULT_CACHE_LIMIT_MB` is `const 500` | Add explicit type or use `as const` |
| `src/lib/utils/helpers.ts:8` | `document.querySelector("video")` returns `Element \| null` not `HTMLVideoElement` | Add type assertion or null check |
| `src/lib/utils/library.ts` | `cachingMode()` called as function (signal) but `config.cachingMode` accessed directly | Audit all config access for reactivity consistency |

### 5. Reactivity Concerns (SolidJS) (High)

| File | Issue | Action |
|------|-------|--------|
| `src/lib/utils/config.ts:107-115` | `createSignal` from config values - changes to config won't update signals | Use `createMemo` or derive from store |
| `src/lib/utils/library.ts:102` | `cachingMode()` called correctly as signal | Verify all signal usages are function calls |
| `src/lib/utils/library.ts:194` | `syncAudioCache` calls `cachingMode()` but `config.cachingMode` used elsewhere | Standardize on signal access |

### 6. Inconsistent Naming (Medium)

| File | Issue | Action |
|------|-------|--------|
| `src/lib/utils/library.ts` | Uses `CACHED_COLLECTION`/`DISCOVERY_COLLECTION` constants but `fetchCollection` uses string literals | Replace all string literals with constants |
| `src/lib/utils/helpers.ts` | `proxyHandler` redefined with different signature | Remove old definition, ensure single source of truth |

### 7. CSS/Asset Issues (Medium)

| File | Issue | Action |
|------|-------|--------|
| `src/styles/patterns.css` | Added `.sortable-list`, `.sortable-item` but no component changes visible | Verify components use these classes or remove unused styles |
| `src/styles/remixicon.css` | Added `ri-video-line`, `ri-draggable`, removed `ri-download-2-fill` | Verify icon usage in components matches available icons |

### 8. Line Ending Issues (Low)

| Files | Issue | Action |
|-------|-------|--------|
| 30+ files | CRLF/LF warnings in git | Run `git config core.autocrlf input` and normalize |

---

## Fix Sequence

### Phase 1: Critical - Remove Dead Code & Fix Imports
1. Delete `src/lib/modules/setMetadata.ts` if unused
2. Delete `src/lib/modules/setAudioStreams.ts` if unused
3. Remove duplicate functions from `helpers.ts` (lines 1-111)
4. Verify all imports resolve correctly
5. Run `tsc --noEmit` to catch type errors

### Phase 2: High - Standardize Formatting
1. Choose CSS formatting style (recommend: expanded/multi-line for readability)
2. Apply consistent formatting to all modified files
3. Standardize import/export formatting
4. Run `prettier --write` if configured, or manual alignment

### Phase 3: High - Type Safety & Reactivity
1. Fix `config.cacheLimit` type
2. Fix `document.querySelector` type
3. Audit all config access for signal vs direct consistency
4. Ensure signals are derived correctly from config store

### Phase 4: Medium - Naming & CSS
1. Replace string literals with constants in `library.ts`
2. Verify sortable CSS classes are used or remove
3. Verify remixicon usage matches available icons

### Phase 5: Low - Line Endings
1. Normalize line endings across repository
2. Configure `.gitattributes` for consistent handling

---

## Verification Steps

After each phase:
```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Lint (if configured)
npm run lint
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking imports | High | Build failure | Phase 1 verification |
| Reactivity bugs | Medium | Runtime issues | Audit signal usage |
| CSS regressions | Low | Visual bugs | Visual review |
| Cache logic errors | High | Data loss | Test offline playback |

---

## Related Files to Review

- `src/lib/utils/core.ts` - Canonical utility functions
- `src/lib/modules/audioCache.ts` - Consolidated cache module
- `src/lib/utils/player.ts` - Consolidated player logic
- `src/lib/utils/library.ts` - Library/collection logic
- `src/lib/utils/config.ts` - Configuration with signals
- `docs/systems/offline-opfs.md` - OPFS system guide