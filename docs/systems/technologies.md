# Technology Inventory

Living inventory of the runtimes, frameworks, platform APIs, services, and formats used by ytify. Update this file when a dependency, hosting component, or integration is added or removed.

Last reviewed: 2026-10-25

## Runtime and Language

| Technology | Role | Where |
| --- | --- | --- |
| TypeScript 7 (strict, ESNext) | Primary language for client, backend, edge functions, and scripts | `src/`, `netlify/`, `scripts/` |
| ECMAScript modules | Module format throughout | `package.json`, all source |
| SolidJS JSX | Component authoring and fine-grained reactivity | `src/**/*.tsx` |
| HTML5 + modern CSS | Application shell and UI | `index.html`, `src/styles/` |
| Bun 1.4 | Script runner, test runner, package/build orchestration | `package.json` scripts |
| Node-compatible `node:sqlite` | Local Durable Object storage emulation | `src/backend/localAdapter.ts` |
| HTTP, REST/JSON, CORS | API communication and allowlisted browser access | client, Worker, edge functions |
| Web APIs | Playback, storage, workers, cryptography, media, and device integration | Client and edge code |

## Frontend

| Technology | Role | Where |
| --- | --- | --- |
| SolidJS 1.9 | Reactive UI framework | `src/components/`, `src/features/` |
| `solid-js/store` | Nested application/session state with fine-grained updates | `src/store.ts`, `src/config.ts` |
| `solid-js/lazy` | Route and feature-level code splitting | `src/index.tsx`, feature entry points |
| Vite 8 | Dev server, bundling, aliases, and local API middleware | `vite.config.ts` |
| `vite-plugin-solid` | SolidJS compilation | `vite.config.ts` |
| `vite-plugin-pwa` + Workbox | Manifest generation, service worker, precaching, offline shell | `vite.config.ts`, build output |
| `postcss-jit-props` + Open Props | Just-in-time CSS custom properties from Open Props | `vite.config.ts`, `src/styles/` |
| Autoprefixer | Vendor-prefix generation | `vite.config.ts` |
| Plain CSS + CSS custom properties | Styling, theming, responsive layout, and player backgrounds | `src/styles/`, components |
| RemixIcon | Icon set, filtered to the icons actually used | `public/remixicon.woff2`, `src/styles/remixicon.css` |
| `subset-font` | Builds the small WOFF2 RemixIcon subset | `scripts/generate-icons.ts` |
| Native HTML5 drag events + touch events | Reorderable lists without a drag-and-drop library | `src/modules/sortable.tsx` |

No Tailwind, CSS-in-JS, component library, animation library, or external state-management library is used.

## Audio and Playback

| Technology | Role | Where |
| --- | --- | --- |
| `HTMLAudioElement` | Audio playback engine | `src/store.ts`, player features |
| Media Session API | Lock-screen/OS media controls, metadata, and position state | `src/modules/mediaSession.ts`, `src/modules/playback.ts` |
| Opus audio streams | Preferred cached audio format | `src/modules/audioCache.ts` |
| AAC/MP4 audio | JioSaavn fallback streams | `src/modules/jioSaavn.ts` |
| Blob URLs | Playback of cached OPFS audio and artwork | `src/modules/audioCache.ts` |
| SponsorBlock API | Sponsor/self-promo/intro/outro segment skipping | `src/modules/sponsorBlock.ts` |
| LRCLIB API | Synced lyrics lookup | `src/features/Player/Lyrics.tsx` |

## Local-First Storage and Browser APIs

| Technology | Role | Where |
| --- | --- | --- |
| Origin Private File System (OPFS) | Offline audio and thumbnail cache | `src/modules/audioCache.ts` |
| `localStorage` | Library, settings, drawer state, and sync metadata | `src/config.ts`, `src/modules/library.ts`, `src/modules/cloudSync.ts` |
| `sessionStorage` | Stream-data cache, playback session, and trash history | `src/modules/audioCache.ts`, `src/modules/getStreamData.ts` |
| Cache Storage via Workbox | PWA precache and offline app shell | service worker generated at build |
| Fetch + `AbortController` | All network access, cancellation, and retries | client, edge, backend |
| Clipboard API + `ClipboardItem` | Copying shared collection links and reading playlist links | `src/modules/listUtils.ts`, `src/modules/importYouTubePlaylist.ts` |
| Canvas 2D / `OffscreenCanvas` | Extracting dominant artwork colors for dynamic theming | `src/modules/extractColorFromImage.ts` |
| `IntersectionObserver` | Incremental collection-list pagination | `src/modules/library.ts` |
| `ResizeObserver` | Player layout measurements | `src/features/Player/index.tsx` |
| `matchMedia` | Orientation and color-scheme detection | `src/index.tsx`, `src/modules/theme.ts` |
| Page Visibility API + window focus | Sync lifecycle triggers | `src/modules/cloudSync.ts` |
| History API | Query-param routing and URL normalization | `src/modules/start.ts`, `src/store.ts` |
| Web App Manifest features | Installability, share target, launch handler, shortcuts | `vite.config.ts` |

## PWA and Offline

| Technology | Role |
| --- | --- |
| Web App Manifest | Install metadata, icons, shortcuts, share target, standalone display |
| Service worker (Workbox) | Precache, offline asset serving, update flow |
| OPFS cache | Offline audio and artwork |
| Cache-aware stream/session stores | Reduced network churn and recovery from transient failures |
| Media Session API | Native media controls while the PWA is backgrounded |

## Backend: Cloudflare

| Technology | Role | Where |
| --- | --- | --- |
| Cloudflare Workers | Public API runtime | `src/backend/worker.ts` |
| Cloudflare Durable Objects | Single-writer coordination and persistent user/catalog state | `src/backend/*DO.ts` |
| Durable Object SQLite storage | User sync and canonical catalog state | `src/backend/UserSyncDO.ts`, `CatalogDO.ts` |
| Durable Object alarms | Deferred/background Durable Object work | `src/backend/*DO.ts` |
| Workers Cache API | Edge caching for read-only catalog/featured routes | `src/backend/worker.ts` |
| Cloudflare `nodejs_compat` | Node compatibility for the Worker bundle | `wrangler.toml` |
| Wrangler | Worker configuration and deployment | `wrangler.toml` |
| `@cloudflare/workers-types` | Worker, Durable Object, and execution-context types | `src/backend/` |

Durable Object classes:

- `UserSyncDO` — per-user library sync, merge state, and deleted-item tracking.
- `CatalogDO` — global canonical songs, videos, tracks, categories, and curated playlists.


## Backend: Netlify

| Technology | Role | Where |
| --- | --- | --- |
| Netlify hosting | Static frontend deployment and previews | `dist/` |
| Netlify Edge Functions (Deno) | Stream fallback, search suggestions, link previews, shared collections | `netlify/edge-functions/` |
| Netlify Blobs | Session storage fallback and immutable shared collections | `stream.ts`, `static.ts` |
| Netlify Scheduled Functions | Monthly cleanup of old shared collections | `netlify/functions/cleanupSharedCollections.ts` |
| Web Crypto API | HMAC-SHA256 signed sessions and constant-time verification | `netlify/edge-functions/stream.ts` |
| `@netlify/edge-functions`, `@netlify/functions`, `@netlify/blobs` | Platform types and storage clients | `netlify/` |

Netlify edge routes:

- `/s/:id` and `/s/` — RapidAPI stream fallback, signed sessions, lease-gated upstream calls, link previews.
- `/ss` and `/ss/:id` — shared collection storage and retrieval.
- Search suggestions — YouTube/YouTube Music suggestions at the edge.
- Album/artist/channel/playlist preview routes — social/link preview HTML.

## Local Development

| Technology | Role | Where |
| --- | --- | --- |
| Vite middleware | Serves the Cloudflare Worker API during `vite dev` | `vite.config.ts` |
| Local API adapter | Adapts the Worker `fetch` handler to Node/Vite request/response | `src/backend/localAdapter.ts` |
| `node:sqlite` in-memory databases | Emulates Durable Object SQLite locally | `src/backend/localAdapter.ts` |
| In-memory key/value + timer-backed alarms | Emulates Durable Object storage and alarms | `src/backend/localAdapter.ts` |
| `src/backend/getSearchSuggestions.ts` | Local search-suggestion path when Netlify Edge is unavailable | `src/backend/` |

## External Services and APIs

| Service/API | Use |
| --- | --- |
| YouTube InnerTube via `youtubei.js` 18 | Search, albums, artists, channels, playlists, recommendations, metadata, and suggestions |
| YouTube oEmbed | Free link-preview fallback |
| YouTube Music search suggestions (`WEB_REMIX`) | Music-specific autocomplete at the Netlify edge |
| YouTube image CDNs (`i.ytimg.com`, `yt3.googleusercontent.com`, `lh3.googleusercontent.com`) | Artwork and thumbnails |
| wsrv.nl | Image resizing/proxying and WebP conversion |
| Invidious public instances | Stream-data and radio/mix fallback |
| Piped API | Songshift import metadata lookup |
| RapidAPI `yt-api.p.rapidapi.com` | Last-resort stream resolution through Netlify Edge |
| SponsorBlock (`sponsor.ajay.app`) | Segment skip data |
| LRCLIB (`lrclib.net`) | Synced lyrics |
| JioSaavn API proxy + `aac.saavncdn.com` | Optional alternate audio source |
| Netlify Blobs | Server-side session/shared-collection storage |
| Weblate | Community translation workflow for `src/locales/` |

## Data Formats

- JSON — API payloads, local storage, locales, manifests.
- LRC — synced lyrics.
- Opus — preferred cached audio.
- AAC/MP4 — JioSaavn fallback audio.
- WebP — thumbnails and artwork.
- WOFF2 — subsetted icon font.

## Tooling and Quality

| Tool | Role |
| --- | --- |
| TypeScript compiler | `tsc --noEmit` type checking |
| Bun test | Unit and integration tests under `scripts/` |
| Knip | Unused files, exports, types, and duplicate exports |
| Vite build | Production bundle and PWA generation |
| `scripts/generate-icons.ts` | Scans used RemixIcon classes and regenerates the WOFF2 subset and CSS |
| Git / GitHub | Source control and collaboration |
| Netlify deploy previews | Per-PR frontend previews |

Build pipeline: `bun run build` runs icon generation, `tsc`, then `vite build`.

## Architecture Constraints

- No new npm dependencies without explicit approval.
- Only `solid-js` is a runtime dependency.
- Prefer native Web APIs over libraries: OPFS, Media Session, Canvas/OffscreenCanvas, Fetch, Clipboard, Web Crypto.
- Local-first and offline-tolerant: storage and cache paths must fail closed without breaking playback.
- Recommendations and history stay on-device; no telemetry or tracking SDKs.
- The frontend targets modern browsers and ships an ESNext bundle.
- Cloudflare handles API/Durable Object coordination; Netlify handles hosting, edge functions, Blobs, and scheduled cleanup.

## Related Documentation

- `docs/systems/streaming.md` — stream resolution and failover.
- `docs/systems/cloud-sync.md` — Cloudflare Durable Object sync.
- `docs/systems/catalog.md` — canonical catalog and scraper.
- `docs/systems/backend-contracts.md` — backend routes and schemas.
- `docs/systems/offline-opfs.md` — OPFS audio cache.
- `docs/systems/library-state.md` — library schema and routing.
- `docs/systems/ui.md` — UI standards.
- `docs/systems/code-quality.md` — code-quality checklist.
- `docs/systems/search.md` — dual-path search suggestions.
