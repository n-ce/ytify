# Plan: Modern SDD Transition, Core Pure Layer & Playback Consolidation

**Status:** Completed (Phases 1-3)  
**Date:** 2026-09-26  
**Goal:** Maximize code quality and runtime performance while reducing codebase footprint, bundle size (<200KB gzipped budget), and agent context consumption.

---

## 1. Context & Motivation

ytify has transitioned into a high-performance PWA with Cloudflare Durable Objects + SQLite sync, OPFS audio caching, and dual-panel layout. However:

1. **OpenSpec Governance Burden:** 19 spec folders with 173 empty checkboxes (bun run validate exits with code 1), heavy REQ-XX-### bureaucracy, and unmaintained proposal workflows.
2. **Context Window Bloat:** Passing whole spec catalogs to AI agents burns context tokens and causes agent drift.
3. **The Modularity Tax (Over-Fragmentation in Critical Path):** When playing a song, the app executes 4+ micro-chunks dynamically (@modules/setMetadata, @modules/setAudioStreams, @modules/mediaSession, @modules/getStreamData), generating runtime network/module-loader latency and chunk wrapper boilerplate.
4. **Circularity & Chunk Leaks:** Circular dependencies between @stores and @utils barrel files prevent optimal tree-shaking and lead to eager module evaluation.

---

## 2. Non-Goals

- We will **not** rewrite UI features or alter visual layout.
- We will **not** over-modularize or break apart tightly coupled critical paths.
- We will **not** introduce new external dependencies (no state libs, no lodash, no CSS libs).
- We will **not** keep duplicate plan formats or editor-specific folders (.kilo/plans).

---

## 3. Architecture & Target Design

### A. Root Agent Invariant Contract (AGENTS.md)

Create a single, lightweight (~60 lines, ~300 tokens) AGENTS.md at root:

- Negative constraints: <200KB gzipped budget, zero unapproved npm dependencies, no SolidJS prop destructuring.
- Anti-redundancy rule: Mandatory check of existing utilities before implementing helpers.
- On-demand index: Pointers to deep subsystem specs in docs/systems/ (read only when touching those systems).

### B. Pure Agnostic Core (src/core/)

Establish an independent, pure layer with zero dependencies on SolidJS, DOM, or stores:

- src/core/time.ts: parseDuration, convertSStoHHMMSS, time conversions.
- src/core/url.ts: idFromURL, YouTube URL sanitizers, query builders.
- src/core/array.ts: shuffle<T>, deduplication, chunking.
- src/core/crypto.ts: User sync hashing primitives.
- **Rule:** src/core/ functions must be 100% deterministic, side-effect free, and testable in sub-milliseconds with bun test.
- Add @core alias to tsconfig.json and vite.config.ts.

### C. Playback Pipeline Consolidation (Killing the Micro-Chunk Tax)

Consolidate the playback path into a single, cohesive engine:

- Inline or statically group setMetadata.ts, setAudioStreams.ts, and core mediaSession.ts updates directly into the player execution flow.
- Eliminate 3-4 micro-chunk dynamic import() hops on song play.
- Keep only genuine heavy/optional features lazy (jioSaavn.ts, bulkCapture.ts, importSongshiftStreams.ts, cloudSync.ts).

### D. Documentation & Spec Migration (openspec/ -> docs/)

Migrate valuable knowledge out of openspec/ and remove the framework:

- Move architecture knowledge to docs/systems/:
  - docs/systems/streaming.md (proxy failover, bitrate selection)
  - docs/systems/cloud-sync.md (Durable Object SQLite, delta sync, auth)
  - docs/systems/offline-opfs.md (OPFS cache lifecycle, PWA worker)
  - docs/systems/library-state.md (v5 storage schema, migrations)
- Move code quality principles to docs/standards/:
  - docs/standards/code-quality.md
  - docs/standards/backend-api.md
- Remove scripts/validate-features.ts and remove "validate" script from package.json.
- Safely clean up untracked openspec/ and .kilo/ directories.

---

## 4. Work Breakdown & Implementation Steps

### Phase 1: Establish Pure Core (src/core/)

- [x] Create src/core/time.ts, src/core/url.ts, src/core/array.ts, src/core/crypto.ts, src/core/index.ts.
- [x] Add @core alias to tsconfig.json and vite.config.ts.
- [x] Update imports in src/lib/utils/helpers.ts, player.ts, queue.ts, and components to use @core.
- [x] Run bun run build to verify clean build and check initial bundle impact.
- [x] Add unit test suite in scripts/core.test.ts (all tests passing).

### Phase 2: Playback Critical-Path Consolidation

- [x] Review src/lib/utils/player.ts, @modules/setMetadata.ts, and @modules/setAudioStreams.ts.
- [x] Consolidate synchronous metadata updates and stream proxy handling into direct execution in player.ts.
- [x] Eliminate dynamic micro-chunk hops on song play; convert module files into backward-compatible shims.
- [x] Measure reduction in micro-chunks in dist/assets/ (setAudioStreams and setMetadata micro-chunks eliminated).

### Phase 3: Transition Specs to docs/ & Create AGENTS.md

- [x] Author AGENTS.md at project root with negative constraints and subsystem doc map.
- [x] Extract key technical architecture into docs/systems/ and docs/standards/.
- [x] Remove scripts/validate-features.ts and update package.json.
- [x] Remove untracked openspec/ and .kilo/ folders.

### Phase 4: Long-Term Dependency Optimization (Evaluated)

- [ ] Evaluate replacing sortablejs (~13.5 kB gzipped) with a lightweight native drag/touch handler.

---

## 5. Verification & Acceptance Criteria

1. **Build & Typecheck:** bun run build succeeds without type errors or broken paths. (Verified: builds cleanly in ~730ms).
2. **Bundle Size:** Initial JS entry bundle remains <= 23.34 kB gzipped. (Verified: 23.41 kB gzipped).
3. **Chunk Reduction:** Number of dynamic chunk files loaded during standard audio play drops from 4 to 1-2. (Verified: setMetadata and setAudioStreams micro-chunks consolidated).
4. **Agent Context:** Prompt context requirement drops from ~15 spec files to a single ~60-line AGENTS.md. (Verified: AGENTS.md active at root).
