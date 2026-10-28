# Modularization Plan: Extracting Self-Contained, Testable Components

This plan identifies tightly coupled parts of the ytify codebase and proposes concrete extractions into self-enforcing, testable modules with explicit inputs/outputs.

## Goals
- Reduce coupling so targeted changes become possible
- Extract pure/domain logic into isolated, testable modules (no direct global store/config/localStorage side effects where possible)
- Make boundaries explicit (ports/adapters) so pieces can be containerized/replaced
- Preserve existing behavior, bundle size budget (<=23.5KB gzipped entry, <200KB total), and zero new dependencies

## Current Coupling Hotspots

| Area | Symptoms | Root Cause |
|---|---|---|
| `src/store.ts` (948 lines) | Global mutable state, URL/history sync, player lifecycle, queue logic, search logic, list logic all together. Imports from many modules and they import back. | "God store" - mixing UI/navigation, playback coordination, networking concerns, and side effects. |
| `src/modules/playback.ts` | Tightly coupled to `playerStore`, `config`, `@modules/*`, MediaSession, DOM. Long `player()` function with multiple concerns (cache check, metadata, streams, video, prefetch). | Orchestration mixed with policy (quality selection, DRC/xtags, proxy handling) and I/O. |
| `src/modules/getStreamData.ts` | Network orchestration (proxy fallback chain) mixed with caching (`streamCache`) and store mutation (`setPlayerStore`). Hardcodes proxy list. | Strategy + I/O + state mutation intertwined. |
| `src/modules/audioCache.ts` (large) | OPFS I/O, LRU/state sync (localStorage), ObjectURL lifecycle, thumbnails, eviction all in one. Called from playback/library/errors. | Multiple responsibilities, implicit global state. |
| `src/modules/library.ts` | localStorage schema, collections/reserved logic, discovery, cached (depends on audioCache), cloud sync triggers, UI store coupling. | Data access + domain rules + side effects combined. |
| `src/modules/audioErrorHandler.ts` | DOM/Audio element mutation, proxy logic, cache invalidation, store updates. | Error handling policy coupled to transport details. |
| `src/store.ts` + `src/config.ts` | Bidirectional coupling (store reads config, config persists to localStorage, signals created there). | Configuration and global state not separated from orchestration. |
| Backend (`src/backend/*`) | Handlers mix routing, fetching from upstream, normalization, catalog access, DO calls. Some duplication with client. | Transport + transformation not separated. |

## Proposed Modularization

### 1. Domain/Core (Pure, Testable)
Extract pure functions with no side effects.

| Target | Extract To | What | Inputs/Outputs | Tests |
|---|---|---|---|---|
| Duration/formatting | `core/format.ts` (or keep in `@utils` but split) | `parseDuration`, `convertSStoHHMMSS` - already pure. Ensure no deps. | string/number -> number/string | Unit |
| URL/ID utils | `core/url.ts` | `idFromURL`, `hostResolver`, `pathModifier` | strings -> strings/ids | Unit |
| Queue ops | `core/queue.ts` | `shuffle`, `reorderItem`, `groupQueueByAuthor`, `normalizeAuthor`, `filterItemsByConfig` (pure version taking sets/limits), `totalQueueDuration` | arrays/sets/config -> arrays/values | Unit (property tests ideal) |
| Stream selection | `core/streamSelection.ts` | `selectPreferredStream(audioStreams, quality, supportsOpus)`, `applyXtagFilter(audioStreams, stableVolume)` - pure policy. | streams + prefs -> single stream/filtered list | Unit |
| Image URL gen | `core/image.ts` | `generateImageUrl` | id/res/music -> string | Unit |

Notes: Move pure pieces out of `store.ts`/`playback.ts`. Keep existing `@utils` if preferred, but enforce "no side effects" rule.

### 2. Data Access / Ports (Adapters)
Define interfaces, implement adapters (OPFS/localStorage/fetch).

| Module | Interface | Adapters | Notes |
|---|---|---|---|
| `ports/TrackStore` | `get(id): TrackItem\|null`, `getAll(): Collection`, `save(map): void` | `adapters/localStorageTrackStore.ts` | Wraps `library_tracks`. No store imports. |
| `ports/CollectionStore` | `getKeys(): string[]`, `getIds(name): string[]`, `add(name,ids)`, `remove(name,ids)`, `getMeta(): Meta`, `setMeta(m): void` | `adapters/localStorageCollectionStore.ts` | Wraps `library_*`, `library_meta`. |
| `ports/CacheStore` (audio) | `getOpus(id): Promise<Blob\|null>`, `putOpus(id, blob): Promise<void>`, `deleteOpus(id): Promise<void>`, `list(): Promise<string[]>`, `getThumb(id,music): Promise<Blob\|null>`, `putThumb(id,music,blob): Promise<void>`, `reconcile(known): Promise<string[]>` | `adapters/opfsCacheStore.ts` | Pure I/O boundary. No config/playerStore imports. Takes limits/callbacks. |
| `ports/StreamSource` | `fetch(id, signal?): Promise<StreamData>` where `StreamData = Invidious \| {error,...}` | `adapters/invidiousStreamSource.ts` (current logic) | Configurable proxy list, retry strategy injectable. |
| `ports/ArtworkSource` | `getUrl(id,music): Promise<string>` | `adapters/artworkSource.ts` | Composes cache + generator + proxy. |
| `ports/ConfigStore` | `get<K>(k): V`, `set<K>(k,v): void`, `subscribe(k,cb)` | `adapters/localStorageConfigStore.ts` or keep signals but behind port | Decouple from solid signals if needed for testing. |

### 3. Services (Use Cases, Orchestrators)
Coordinate ports/core with minimal side effects; injected deps for testability.

| Service | Responsibility | Dependencies (injected) | Notes |
|---|---|---|---|
| `services/PlaybackService` | Orchestrate `player(id)`: check cache -> apply metadata -> select stream -> set src/play; handle prefetch/quickSwitch. Remove DOM/media session side effects to handlers or inject. | `TrackStore`, `CacheStore`, `StreamSource`, `ArtworkSource`, `StreamSelector` (core), `EventBus`/callbacks | Break `playback.ts` into pure planning + IO service. Return plan `{action:'play'|'cache'|'fail', ...}` or execute via callbacks. |
| `services/QueueService` | Manage queue/history with filters/grouping/shuffle. Pure logic + store updates via callbacks. | `QueuePolicy` (core), `TrackStore` | Move logic from `store.ts` functions into service; store becomes thin adapter. |
| `services/LibraryService` | Collections CRUD, reserved/pseudo collections, discovery, cached integration, sync triggers. | `CollectionStore`, `TrackStore`, `CacheStore`, `CloudSync` port | Decouple from `listStore/navStore/setStore`. Emit events. |
| `services/StreamResolutionService` | Proxy fallback chain with backoff, "emergency fallback", cache of results. | `StreamSource` impl, logger, config | Extract from `getStreamData.ts`; injectable proxy list. |
| `services/SearchService` | Suggestions (debounce/cancel), results fetch, recent searches. | fetch port, `ConfigStore` | Extract from `store.ts`. |
| `services/CacheService` | LRU, eviction by size/count, reconciliation, in-flight tracking. | `CacheStore`, `ConfigStore`, `TrackStore` | Extract orchestration from `audioCache.ts`. Keep OPFS details in adapter. |

### 4. Transport/Adapters for External
| Item | Plan |
|---|---|
| `getStreamData.ts` | Split into `StreamResolutionService` + `invidiousStreamSource`. Make proxy instances configurable (env/config). Keep emergency fallback as strategy. |
| `audioCache.ts` | Split into `CacheService` (policy/LRU/reconcile) and `opfsCacheStore` (I/O). Return `ObjectURL` via adapter/factory; track revocation separately. |
| `audioErrorHandler.ts` | Convert to `StreamErrorHandler` strategy: takes error context + ports, returns action (`retryWithProxy`, `fail`, `invalidateCache`) without directly mutating arbitrary DOM except via callbacks. |
| Backend (`src/backend/*`) | Define handler interfaces (`RequestContext`, `ResponseWriter`), extract normalizers (`backend/normalizers/*`), extract fetchers (`backend/fetchers/*`), keep DOs thin. Apply same ports pattern. |

### 5. State/UI Layer (Thin)
| Item | Plan |
|---|---|
| `src/store.ts` | Reduce to composition root: create stores/signals, wire services with adapters, expose bound actions. Move all business logic to services/core. Target < 200-300 lines. |
| `src/config.ts` | Split into `ConfigSchema` (types/defaults/validation), `ConfigRepository` (persistence), `ConfigService`/signals. Validate values on load (already partially done). |
| Features/Components | Keep as-is mostly; consume services via context/hooks. Avoid importing modules directly where possible. |

## Concrete Extraction Order (Low Risk → High Impact)

1. **Core utils split** (trivial): extract pure functions to `src/core/*`, update imports. No behavior change. 
2. **Ports + adapters for stores**: wrap localStorage access (tracks/collections/config). Migrate library/config to use them behind interfaces.
3. **Stream selection**: extract `core/streamSelection.ts`, unit test, use in playback.
4. **Queue logic**: extract to `core/queue.ts` + `services/QueueService`. Migrate `store.ts` queue functions.
5. **Stream resolution**: refactor `getStreamData.ts` into service+source adapter; injectable proxies.
6. **Cache split**: split `audioCache.ts` into `CacheService` + `opfsCacheStore`. Careful with ObjectURL lifecycle/revocation.
7. **Playback orchestration**: break `player()` into smaller functions/planner + `PlaybackService`. Reduce coupling to stores.
8. **Store decomposition**: move remaining logic from `store.ts` to services; convert to thin wiring.
9. **Backend**: apply same boundaries if sharing logic or for testability.

## Testing Strategy
- **Unit**: core/* pure functions (fast, no DOM/OPFS). 
- **Contract/adapter tests**: mock ports (in-memory implementations) for services.
- **Integration**: service + in-memory adapters (queue, library, cache policy).
- **E2E/regression**: keep existing behavior; run `bun test scripts/`, `bun run tsc --noEmit`, `bun run build` at each step.

## File Layout Proposal
```
src/
  core/           # pure domain (format, url, queue, streamSelection, image)
  ports/          # interfaces (TrackStore, CollectionStore, CacheStore, StreamSource, ...)
  adapters/       # implementations (localStorage*, opfsCacheStore, invidiousStreamSource)
  services/       # use cases (PlaybackService, QueueService, LibraryService, CacheService, StreamResolutionService)
  modules/        # keep thin facades or migrate away; avoid cross-coupling
  store.ts        # composition root only
  config.ts       # schema+repository+signals (or split)
```

## Guardrails
- No new dependencies.
- Preserve bundle size; lazy load where appropriate.
- Follow SolidJS rules (no prop destructuring), reuse existing patterns.
- Keep local-first/offline behavior intact.
- Maintain OPFS/thumbnails/ObjectURL semantics.
- Respect "Dual-Path Local Dev vs Deployed Edge Parity" for search suggestions.
- All changes must pass: unit tests, typecheck, build.

## Immediate Next Steps
- Create `src/core/` and move `parseDuration`, `convertSStoHHMMSS`, `shuffle`, `reorderItem` from `@utils`/`store.ts` (pure parts).
- Add `src/ports/` interfaces and in-memory adapters for unit tests.
- Extract `selectPreferredStream` and `applyXtagFilter` from `playback.ts` to `core/streamSelection.ts` with unit tests.
- Refactor `groupQueueByAuthor`, `filterItemsByConfig` to pure core functions taking explicit inputs.
- Plan incremental PRs per extraction to avoid big-bang changes.
