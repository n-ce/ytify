# ytify Agent Invariants

You are working on ytify, a lean, ethical YouTube Music PWA.
Tech stack: TypeScript, SolidJS, Vite, Cloudflare Workers (Durable Objects + SQLite).

## 1. Zero-Bloat Budget (CRITICAL)
- Target initial JS entry: <= 23 KB gzipped. Total bundle: < 200 KB gzipped.
- ZERO new npm dependencies without explicit consent. Use native Web APIs (OPFS, Web Audio, MediaSession) and CSS custom properties.
- Do NOT add external UI, utility, or animation libraries (no lodash, no tailwind, no framer).

## 2. Code Reuse & Redundancy Prevention
- BEFORE creating a new helper function or data transformer, check:
  - src/lib/utils/core.ts (pure math, duration, url, array logic)
  - src/lib/utils/ (formatting, storage, helpers)
  - src/lib/modules/ (sync, streaming, caching)
  - src/lib/stores/ (app, player, queue, search, list state)
- Do NOT invent parallel patterns. Reuse existing createStore / createSignal state stores.

## 3. SolidJS Reactivity Rules
- NEVER destructure props (const { item } = props breaks reactivity). Access via props.item.
- Prefer fine-grained updates: use <Show> and <For> over array .map() in JSX.
- Lazy load all top-level route/feature views using solid-js/lazy.

## 4. Local-First & Critical-Path Cohesion
- Critical playback path is consolidated: do not over-fragment the audio/stream pipeline into micro-chunks.
- Offline-first: Assume network can fail anytime. Streaming falls back across Invidious proxies and local edge functions.
- Recommendations and history must remain strictly on-device (zero telemetry/tracking).
- Local storage keys are namespaced: library_, config, drawer.

## 5. Documentation & Deep Subsystem Guides
When touching complex subsystems, consult the corresponding guide in docs/:
- Streaming & failover: docs/systems/streaming.md
- CloudSync & Durable Objects: docs/systems/cloud-sync.md
- Offline OPFS audio cache: docs/systems/offline-opfs.md
- Library schema (v5): docs/systems/library-state.md
- Code quality principles: docs/standards/code-quality.md
- Backend endpoints: docs/standards/backend-contracts.md
- Active implementation plans: docs/plans/active/

## 6. Definition of Done
- TypeScript compiles cleanly (	sc --noEmit).
- Production build succeeds (un run build).
