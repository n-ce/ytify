# ytify Agent Invariants

You are working on ytify, a lean, ethical YouTube & YouTube Music audio PWA.
Tech stack: TypeScript, SolidJS, Vite, Cloudflare Workers (Durable Objects + SQLite).

## Core Domain & Terminology: Dual-Source Audio (YT & YTM)

- **Audio, Not Just Music / YTM**: ytify plays audio streams from **both** YouTube (videos, podcasts, talks, live audio) and YouTube Music (songs, albums, artists). It is an audio player across the entire YouTube ecosystem, not exclusively a music or YTM client.
- **Terminology Invariant**: Prefer the term **audio** (or "audio item", "stream") over "music" or "song" when referring to media items, queues, playback, caching, or the stream pipeline. The catalog schema explicitly differentiates `canonical_songs` (with album metadata and square artwork) and `canonical_videos` (channel author without square artwork), both treated as first-class audio streams.

## 1. Zero-Bloat Budget (CRITICAL)

- Target initial JS entry: <= 23.5 KB gzipped. Total bundle: < 200 KB gzipped.
- ZERO new npm dependencies without explicit consent. Use native Web APIs (OPFS, Web Audio, MediaSession) and CSS custom properties.
- Do NOT add external UI, utility, or animation libraries (no lodash, no tailwind, no framer).

## 2. Code Reuse & Redundancy Prevention

- BEFORE creating a new helper function or data transformer, check:
  - src/utils.ts (pure math, duration, url, array, image-url logic)
  - src/config.ts (config, drawer, persisted signals)
  - src/modules/ (library, playback, storage, sync, streaming, caching)
  - src/store.ts (single app store: app, navigation, player, queue, search, list state)
- Do NOT invent parallel patterns. Reuse existing createStore / createSignal state stores.

## 3. SolidJS Reactivity Rules

- NEVER destructure props (const { item } = props breaks reactivity). Access via props.item.
- Prefer fine-grained updates: use <Show> and <For> over array .map() in JSX.
- Lazy load all top-level route/feature views using solid-js/lazy.

## 4. Local-First & Critical-Path Cohesion

- Critical playback path is consolidated: do not over-fragment the audio/stream pipeline into micro-chunks.
- Offline-first: Assume network can fail anytime. Streaming prioritizes Cobalt API with Netlify Edge signed token fallback.
- Recommendations and history must remain strictly on-device (zero telemetry/tracking).
- Local storage keys are namespaced: library_, config, drawer.
- **Dual-Path Local Dev vs Deployed Edge Parity (Search Suggestions)**:
  - `netlify/edge-functions/search-suggestions.ts` handles edge requests in production deployments for global low-latency.
  - `src/backend/` (`getSearchSuggestions.ts`, `localAdapter.ts`, `worker.ts`) handles search suggestions locally via Vite's `apiMiddleware` because Netlify Edge Functions are unavailable during local development.
  - NEVER remove or consolidate one into the other; local development must work fully without edge emulation.

## 5. UI System Standards & Invariants

- **Library & Hub Shelf Container Invariant**:
  - Every hub/shelf article (`.subfeed-article`, `.featured-article`, etc.) MUST wrap fallback/empty states and loading state inside a container `<div>` (e.g., `fallback={<div><p class="fallback">{t(...)}</p></div>}`).
  - `article > div` CSS defines the global card standard (`background-color: var(--onBg)`, `border: var(--border)`, `border-radius: var(--roundness)`).
  - Never render bare `<p class="fallback">` without a wrapping `<div>`; doing so breaks background containment.
- **Player Background Transition & Alignment**:
  - In blurred background modes (`.bg-blur`, `.bg-blur-motion`), artwork height is scaled with `height: 80%`.
  - In blurred non-motion mode (`.bg-blur`) and frost non-motion mode (`.bg-frost`), the background artwork is horizontally centered on the player using `--player-bp: -${Math.floor((offsetHeight - offsetWidth) / 2)}px 0`, matching motion mode at half duration (`seconds / fullDuration = 0.5`). Motion modes pan horizontally from left to right with playback progress.
- **Text Truncation**:
  - Truncated text (`.truncate`, `div.metadata`, `.listItem div`) must include `min-width: 0` to prevent premature ellipsis collapse inside flex containers.
- **Tooltips**:
  - Contextual positioning: header and top-bar tooltips render below the icon (`top: 100%`); bottom nav and player controls render above (`bottom: 100%`). Right/left edge icons anchor to inward edge to eliminate off-screen clipping. Strictly hidden on touch via `@media (hover: none)`.

## 6. Documentation & System Specifications

- The `docs/` tree has strictly three functional areas:
  - `docs/systems/`: Living specifications, contracts, and engineering standards for each subsystem.
  - `docs/plan-*.md`: Active implementation plans and RFCs located directly in `docs/` prefixed with `plan-` (no separate `plans/` folder).
  - `docs/archive/`: Historical records (issue tracking history, incident postmortems, completed plans, and legacy design specs).
- System guides:
  - Technology inventory: `docs/systems/technologies.md`
  - Streaming & failover: `docs/systems/streaming.md`
  - CloudSync & Durable Objects: `docs/systems/cloud-sync.md`
  - Global normalized catalog & scraper: `docs/systems/catalog.md`
  - Backend API contracts & schemas: `docs/systems/backend-contracts.md`
  - Offline OPFS audio cache: `docs/systems/offline-opfs.md`
  - Library schema (v5) & routing: `docs/systems/library-state.md`
  - UI standards & shelf invariants: `docs/systems/ui.md`
  - Code quality standards & review checklist: `docs/systems/code-quality.md`
  - Search architecture & dual-path suggestions: `docs/systems/search.md`

## 7. Definition of Done

Every code change must satisfy:

- Unit tests pass: `bun test scripts/`
- TypeScript compiles cleanly: `bun run tsc --noEmit`
- Production build succeeds within budget: `bun run build`
