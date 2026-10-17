# Plan: Featured Shelf Consolidation & Backend Featured API (`getFeatured.ts`)

**Status:** Ready for Review  
**Date:** 2026-10-18  
**Scope:** Backend API routes, Catalog DO, InnerTube scraping & orchestration, Library Featured shelf UI, Favorites Artist shelf coupling, and config deprecation.

---

## 1. Context & Motivation

### Current State & Ambiguities

1. **Ambiguous `/api/recommend` Endpoint:**
   - In `src/backend/worker.ts`, `CatalogDO.ts`, and `catalogClient.ts`, the route is named `/api/recommend`.
   - The term "recommend" is ambiguous: it conflicts conceptually with video autoplay/related streams (`recommendedVideos` from InnerTube) and implies a general-purpose recommendation engine.
   - In reality, this endpoint is **only** used by the Library's Featured shelf to match Moods & Genres curated playlists against the user's history track IDs.

2. **Orphaned `Gallery` Code & Vestigial APIs:**
   - The `Gallery` view (`src/features/Library/Gallery.tsx`) was previously a standalone section in the Library displaying:
     1. User's Artists list
     2. Recommended Artists list ("Fans might also like")
     3. "Featured on" Playlists
   - When Gallery was merged into the Featured shelf, `Gallery.tsx` was unmounted from `src/features/Library/index.tsx`, but remained in the codebase as dead code.
   - The vestigial backend handler `src/backend/getGallery.ts` still parses all three sets.
   - Meanwhile, `ConfigureModal.tsx` and `config.ts` still contain vestigial `gallery` toggles in `librarySections`.

3. **Artist Avatars & Favorites Shelf Coupling:**
   - On the client, tracks in the `favorites` collection only store song/album artwork and channel IDs (`authorId: "UC..."`). Real artist channel avatars cannot be derived client-side because Google avatar URLs rely on opaque upload CDN hashes (`/ytc/AIdro_...`).
   - Extracting the artist's real channel avatar and `Featured on` playlists requires querying the internal InnerTube artist API (`yt.music.getArtist`).
   - When `featured` is enabled, the API can fetch artist data and provide both `featuredOnPlaylists` for the Featured shelf and resolved `artists` (with real avatars) for the Favorites shelf.
   - **Crucial Requirement:** The Artist shelf inside Favorites (`src/features/List/index.tsx`) must be strictly coupled to `librarySections().featured`. If the user disables the Featured shelf in settings, the Artist shelf in Favorites is disabled/hidden/removed and skips any network requests.

4. **Inaccurate "Community Playlists" Moniker & Misaligned Two-Row Shelf:**
   - In `src/features/Library/Featured.tsx`, the Featured shelf displays two rows:
     - **Row 1:** Labeled "Official Playlists" (populated via `/api/recommend`).
     - **Row 2:** Explicitly labeled with the moniker **"Community Playlists"** (`<i class="ri-compass-3-line"></i> Community Playlists`), but populated with `data.relatedPlaylists` from `/api/gallery`.
   - **The Problem:** `relatedPlaylists` from `getGallery.ts` are actually the artist's **"Featured on"** playlists from YouTube Music! Calling them "Community Playlists" is a misnomer: they are editorial or official featured playlists.
   - In YouTube Music's Moods & Genres browse structure, category pages actually contain both official **"Featured playlists"** and genuine **"Community playlists"** created by users.
   - Furthermore, the client currently performs **two separate asynchronous network requests** (`/api/recommend` and `/api/gallery`) with different data schemas (`RecommendedPlaylist` vs `Playlist`), requiring ad-hoc mapping and manual thumbnail path adjustments.

---

## 2. Non-Goals

- We will **not** alter the core scoring algorithm in `CatalogDO` (+10 per shared track index overlap).
- We will **not** add any external dependencies or libraries (maintaining strict `<200 KB` gzipped bundle budget).
- We will **not** fetch artist data if the user has disabled the Featured shelf.
- We will **not** break offline tolerance: the featured shelf will continue to gracefully show containerized fallback states when offline or unpopulated.

---

## 3. Architecture & Target Design

```
Client (Featured.tsx & Favorites in List/index.tsx)
  │
  │ [Only if librarySections().featured is enabled]
  │ GET /api/featured?ids=<historyTrackIds>&artistIds=<favoriteArtistIds>&limit=20
  ▼
Cloudflare Worker (worker.ts)
  │
  ▼
src/backend/getFeatured.ts
  │
  ├───► 1. CatalogDO.featured(ids, limit)
  │        ├─ Curated "Featured playlists" (Moods & Genres)
  │        └─ Curated "Community playlists" (Moods & Genres)
  │
  └───► 2. InnerTube getArtist(artistId) [Promise.all for top favorite artists]
           ├─ Artist "Featured on" Playlists
           └─ Artist Avatars & Metadata ({ id, name, img, type: 'artist' })
  │
  ▼
Unified Response:
{
  featuredPlaylists: YTPlaylistItem[],   // Artist "Featured on" + Moods/Genres Featured
  communityPlaylists: YTPlaylistItem[],  // Moods/Genres Community (+ Artist community if any)
  artists: Channel[]                     // Top favorite artists with real channel avatars
}
```

### 3.1 Backend: New `src/backend/getFeatured.ts`

Create a unified backend handler `src/backend/getFeatured.ts` that orchestrates:

1. **Input Parameters:**
   - `ids` (or `trackIds`): comma-separated string of up to 25 track IDs strictly from the user's persistent `history` collection.
   - `artistIds`: comma-separated string of up to 5 favorite artist IDs (`authorId` from favorites with `- Topic`).
   - `limit`: optional max items per shelf (default 20, max 30).

2. **Parallel Retrieval:**
   - **Catalog Playlists:** Calls `readFeaturedPlaylists(env, trackIds, limit)` (communicating with `CatalogDO`).
   - **Artist "Featured on" Playlists & Channel Avatars:** Calls InnerTube `yt.music.getArtist(id)` for each artist ID in parallel:
     - Extracts `findCarouselByTitle(artist.sections, 'Featured on')` for playlists.
     - Extracts the artist's avatar thumbnail from `MusicImmersiveHeader` or `MusicVisualHeader`.

3. **Partitioning & Unification:**
   - **Row 1 (`featuredPlaylists`):**
     - Sourced from:
       1. Artist `Featured on` playlists (deduplicated by playlist ID, scored/sorted by artist frequency).
       2. Moods & Genres curated playlists whose section/category indicates "Featured" or official editorial curation.
   - **Row 2 (`communityPlaylists`):**
     - Sourced from:
       1. Moods & Genres playlists whose section indicates community curation (e.g., section title matches "Community playlists" or non-editorial category tags).
       2. Any community-curated playlists surfaced by artist data.
   - **Artists List (`artists`):**
     - Sourced from the parsed artist headers: `{ id, name, img, type: "artist" }[]`.
     - Normalizes thumbnail IDs via `formatThumbnailId()`.
   - **Unified Playlist Schema:** Every playlist in both shelves is returned as a clean `YTPlaylistItem`:
     ```typescript
     interface YTPlaylistItem {
       id: string;
       name: string;
       img: string;
       author: string;
       type: "playlist";
     }
     ```

### 3.2 Endpoint Renaming & Routing (`worker.ts`, `CatalogDO.ts`, `catalogClient.ts`)

1. **Rename Route to `/api/featured`:**
   - In `src/backend/worker.ts`:
     - Route `path === "featured"` delegates directly to `getFeatured(env, trackIds, artistIds, limit)`.
     - Maintain `path === "recommend"` as a backward-compatible alias delegating to `CatalogDO.featured`.
     - Deprecate `case "gallery"` in `worker.ts`, either redirecting or returning a stub for legacy clients.
2. **CatalogDO Refactoring:**
   - Rename DO path `/recommend` to `/featured` (while retaining `/recommend` fallback).
   - In `CatalogDO.ts`, enhance playlist row metadata or categorization so playlists preserve their section origin ("Featured playlists" vs "Community playlists").
3. **Scraper Refinement (`src/backend/cron/scraper.ts`):**
   - When scraping category browse pages (`FEmusic_moods_and_genres_category`), inspect each carousel shelf's header title (`MusicCarouselShelf.header.title`) instead of flattening everything into a generic category section title.
   - Store `"Featured playlists"` or `"Community playlists"` into `curated_playlists.section_title`.

### 3.3 Frontend: Refactor `src/features/Library/Featured.tsx`

1. **Strict History Input & Single Network Round-Trip:**
   - Use strictly `getCollection("history")` (omitting `queueStore.history` so listening history is persistent and clean).
   - Single unified fetch:
     ```typescript
     const res = await fetch(
       `${store.api}/featured?ids=${encodeURIComponent(historyIds.join(","))}&artistIds=${encodeURIComponent(artistIds.join(","))}&limit=20`,
     );
     const data = (await res.json()) as {
       featuredPlaylists: YTPlaylistItem[];
       communityPlaylists: YTPlaylistItem[];
       artists: Channel[];
     };
     ```
2. **Remove Misleading Moniker & Update UI Labels:**
   - **Row 1:** Labeled **"Featured Playlists"** (`<i class="ri-star-line"></i> Featured Playlists`), displaying the unified featured & editorial items.
   - **Row 2:** Labeled **"Community Playlists"** (`<i class="ri-compass-3-line"></i> Community Playlists`), displaying genuine community/mood playlists only when present.
   - Remove the false moniker labeling artist editorial playlists as "Community Playlists".
3. **Clean Component Rendering:**
   - Use standard `ListItem` props directly:
     ```tsx
     <ListItem
       name={item.name}
       id={item.id}
       img={item.img}
       author={item.author}
       type="playlist"
     />
     ```
   - Adhere strictly to UI standards from `AGENTS.md` (wrapping empty/fallback states in `<div>`).

### 3.4 Coupling Favorites Artist Shelf to Featured Setting (`List/index.tsx`)

1. **Disable/Hide When Featured is Off:**
   - In `src/features/List/index.tsx`:
     ```tsx
     <Show
       when={
         librarySections().featured &&
         listStore.id === "favorites" &&
         listStore.type === "collection" &&
         favoriteArtists().length > 0
       }
     >
       <div class="list-carousels">
         <ArtistRow artists={favoriteArtists()} />
       </div>
     </Show>
     ```
2. **Skip Network Requests When Featured is Off:**
   - In `createEffect` of `src/features/List/index.tsx`, check `if (!librarySections().featured) { setFavoriteArtists([]); return; }`.
   - When `librarySections().featured` is enabled:
     - Consume the resolved `artists` from the shared featured store or fetch `/api/featured` with the top artist IDs.
     - Never call the legacy `/api/gallery`.

### 3.5 Cleanup & Dead Code Removal

1. **Delete `src/features/Library/Gallery.tsx`:**
   - Remove the orphaned component file.
2. **Deprecate `gallery` from Library Configuration:**
   - Update `LibrarySections` in `src/lib/utils/config.ts` and `src/features/Library/ConfigureModal.tsx`.
   - Remove `gallery` from `SECTIONS` list and default configs, adding migration cleanup in `config.ts` (`delete sections.gallery`).
   - Remove or retire unused `hub_gallery` and `hub_gallery_fallback` translation keys.

---

## 4. Implementation Steps & Checklist

### Phase 1: Backend Scraper & Catalog Updates

- [ ] In `src/backend/cron/scraper.ts`, inspect `MusicCarouselShelf` headers to tag playlists with their carousel title ("Featured playlists" vs "Community playlists").
- [ ] In `src/backend/CatalogDO.ts`, add `/featured` handler (alias `/recommend`), returning categorized playlists or section information.
- [ ] In `src/backend/catalogClient.ts`, export `readFeaturedCatalog(env, ids, limit)` and deprecate `recommend()`.

### Phase 2: Create `src/backend/getFeatured.ts` & Route in Worker

- [ ] Implement `src/backend/getFeatured.ts`:
  - Fetch catalog-scored playlists via `CatalogDO`.
  - Fetch `Featured on` playlists and artist avatars for favorite artists via InnerTube in parallel.
  - Partition into `featuredPlaylists` (artist featured on + catalog featured) and `communityPlaylists` (catalog community).
  - Include parsed `artists: Channel[]` with real avatars.
  - Deduplicate and normalize to `YTPlaylistItem[]`.
- [ ] In `src/backend/worker.ts`, add route `path === "featured"` calling `getFeatured`.
- [ ] Mark `/recommend` and `/gallery` routes as legacy/deprecated wrappers.

### Phase 3: Client Featured Shelf Migration

- [ ] In `src/features/Library/Featured.tsx`:
  - Query using strictly `getCollection("history")`.
  - Update `updateFeatured()` to make a single request to `${store.api}/featured`.
  - Replace `officialPlaylists` / `communityPlaylists` signals with typed `YTPlaylistItem[]`.
  - Update shelf labels: Row 1 to "Featured Playlists", Row 2 to genuine Community playlists.
  - Simplify `ListItem` rendering (use `item.name`, `item.img`, `item.author` directly).
- [ ] Cache resolved `artists` from response for use in Favorites.

### Phase 4: Favorites & Settings Coupling / Cleanup

- [ ] In `src/features/List/index.tsx`:
  - Gate `ArtistRow` rendering and artist avatar fetching behind `librarySections().featured`.
  - When `librarySections().featured` is false, hide the artist shelf and skip all network fetches.
  - Remove call to legacy `/gallery`.
- [ ] Delete orphaned `src/features/Library/Gallery.tsx`.
- [ ] In `src/lib/utils/config.ts`:
  - Remove `gallery` from `LibrarySections` and `defaultLibrarySections`.
  - Add migration to strip `gallery` from stored local config.
- [ ] In `src/features/Library/ConfigureModal.tsx`, remove `gallery` from `SECTIONS`.

### Phase 5: Testing, Validation & Docs Update

- [ ] Update `scripts/test-backend.ts` to test `getFeatured` instead of `getGallery`.
- [ ] Update `scripts/catalog.test.ts` to assert `/featured` route.
- [ ] Run `bun run tsc --noEmit` to ensure zero type errors.
- [ ] Run `bun test scripts/` to ensure all tests pass.
- [ ] Update `docs/standards/backend-contracts.md` and `docs/systems/catalog.md` with `/api/featured` contract and updated architecture.

---

## 5. Invariants & Review Standards

1. **Bundle Budget:** Net delta must be negative or neutral by removing `Gallery.tsx` and consolidating `Featured.tsx`.
2. **Reactivity Safety:** No prop destructuring in SolidJS components.
3. **UI Containment Invariant:** All shelf fallback states wrapped in container `<div>` tags as mandated by `AGENTS.md`.
4. **Local Development Parity:** Compatible with `localAdapter.ts` so `vite dev` works with embedded SQLite without Cloudflare deployment.
