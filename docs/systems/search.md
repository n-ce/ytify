# Search System & Invariants

This document establishes the architecture, query lifecycle, and invariants for search and search suggestions in ytify.

---

## 1. Non-Negotiable Invariants

### 1.1 Dual-Path Search Suggestions Invariant (Local Dev vs. Deployed Edge Parity)

- Search suggestions are intentionally implemented in two distinct environments:
  1. **Production Edge Function**: `netlify/edge-functions/search-suggestions.ts`
     - Runs on Netlify's global edge network on route `/search-suggestions`.
     - Provides sub-50ms latency suggestions with edge cache headers (`s-maxage=86400, stale-while-revalidate=3600`).
     - Dispatches directly to YouTube/YouTube Music suggest endpoints (`WEB_REMIX` / `suggestqueries-clients6`).
  2. **Local Development Backend**: `src/backend/` (`getSearchSuggestions.ts`, `worker.ts`, and `localAdapter.ts`)
     - During local development (`vite` dev mode), Netlify Edge Functions do **NOT** run.
     - The Vite development server uses `apiMiddleware` in `vite.config.ts` to intercept `/search-suggestions` and route it directly to `src/backend/localAdapter.ts` using `getSearchSuggestions`.
- **CRITICAL**: Neither implementation is redundant. Never delete or consolidate the local backend implementation into the edge function, or vice versa. Both must be preserved to maintain full offline local testing parity and high-speed production edge execution.

### 1.2 "All" Filter Channel Carousel Grouping

- When the search filter is set to `"all"` (`config.searchFilter === "all"`), search result items are partitioned:
  - Channel results (`item.type === "channel"`) are grouped together into a top horizontal carousel (`div.list-carousel`).
  - Track/stream results are rendered sequentially below the channel carousel.
- For all other filters (`"video"`, `"song"`, `"album"`, `"playlist"`, `"channel"`), results render in their standard unified list layout.

### 1.3 Debouncing and Cancellation Lifecycle

- Search suggestions employ a 400ms debounce timer (`DEBOUNCE_TIME = 400`) in `src/lib/stores/search.ts`.
- Every incoming keystroke aborts previous inflight controllers via `AbortController.abort()`.
- Upon submitting a search query or pressing Enter/Escape, `clearSuggestions()` cancels pending timers, aborts active requests, and resets the suggestion array to prevent stale dropdown re-population.

### 1.4 Navigation Lifecycle & Library Param Stripping

- Navigating into Search (via query submission, search suggestion click, or URL `/search?q=...`) must cleanly clear the `library` flag.
- The URL query string strips `library` (`url.searchParams.delete("library")`) so the application displays the Search view without residual flags or conflicting states (`/search?q=foo&library`).

---

## 2. InnerTube Parser Handling (youtubei.js v18.2.0+)

### 2.1 Native LockupView Duration Getters

- In `youtubei.js@18.2.0+`, `YTNodes.LockupView` provides first-class native duration getters:
  - `item.duration?.text` (formatted timestamp, e.g. `"3:45"`)
  - `item.duration?.seconds` (numeric seconds, e.g. `225`)
- Backend item mappers (`listMapper`, `utils.ts`, `getSubFeed.ts`) consume `item.duration` directly, eliminating manual loops over `overlay_metadata` badge arrays or regex parsing of `ThumbnailOverlayTimeStatusView`.

### 2.2 Short Video Filtering

- YouTube frequently returns Shorts in video/song search feeds.
- Any track/video with duration `< 90` seconds lacking an `albumId` (indicating a non-song short) is filtered from general music results to maintain a clean listening experience.

### 2.3 LockupView Playlists & Albums

- InnerTube returns playlists as `YTNodes.LockupView` with `content_type === "PLAYLIST"`.
- `listMapper` in `src/backend/utils.ts` extracts metadata and thumbnails from `LockupMetadataView` and `CollectionThumbnailView`, ensuring search playlists and albums populate with correct artwork and title metadata.
