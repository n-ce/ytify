# Issues & Implementations

Status of all items F through Z:

- [x] **F. In Portrait mode, clicking View Channel from Player should scroll to the Channel View**
  - Player closes on author/album navigation (`closeFeature("player")`), revealing miniplayer.
  - Channel/playlist navigation explicitly scrolls the view into target via `navStore.list.ref?.scrollIntoView({ behavior: "smooth" })`.

- [x] **G. Local Library Search sometimes creates empty collections**
  - Removed side-effect generation loops from `Collections.tsx`.
  - Moved single-pass initial seeding of default collections (`favorites`, `listenLater`) to boot in `start.ts`.

- [x] **H. Make the queue timer click scroll to the top of the queue**
  - Updated duration badge in `Queue/index.tsx` (both header title and extra slot) with smooth scroll to top (`scrollTo({ top: 0, behavior: "smooth" })`).

- [x] **I. Only add to cache after full song listened**
  - Removed automatic OPFS audio caching from the 10-second playback timer in `recordTrackPlay`.
  - Added `cacheTrackOnFinished` invoked on `playerStore.audio.onended`, guaranteeing audio is cached as late as possible after full song playback.

- [x] **J. Transfer Moods&Genres API to main repo/cf**
  - Integrated `/catalog/categories` and `/recommend` routes in Cloudflare Worker (`worker.ts`, `CatalogDO.ts`).

- [x] **K. Sponsorblock support**
  - Added `sponsorblock: false` setting in `config.ts` with toggle in Settings (`settings_sponsorblock`).
  - Added dedicated `src/lib/modules/sponsorBlock.ts` auto-skipping segments (sponsors, intros, outros, self-promo, off-topic) exclusively for non-music tracks without clickable UI elements.

- [x] **L. Remove Version Label**
  - Removed version label `{Build}` in `Settings/index.tsx`, displaying concise `ytify` brand tag.

- [x] **M. Fallback Gate Protocol**
  - Integrated `StreamGateDO` and signed stream session fallback token protocol with IPv4/IPv6 client binding.

- [x] **N. Keyboard Shortcuts for Navigation**
  - Strict global keydown listeners in `src/index.tsx`: `1` (Queue), `2` (Search), `3` (Library), `/` (Focus search input).

- [x] **O. Playback Actions through user Keyboard**
  - Web music shortcuts: `Space` (Play/Pause), `ArrowLeft`/`ArrowRight` (-/+ 5s), `Shift+ArrowRight`/`Shift+N`/`]` (Next track), `Shift+ArrowLeft`/`Shift+P`/`[` (Prev track), `ArrowUp`/`ArrowDown` (Volume), `M` (Mute/Unmute).

- [x] **P. Pan out Background / Scale to fit in Blurred mode**
  - In `Player.css`, scaled `.bg-blur` and `.bg-blur-motion` image height to `60%`, ending exactly where the gradient opaque transition begins.

- [x] **Q. Fix Lyrics overflow**
  - Set `overflow-y: auto; overflow-x: hidden;` on `.lyrics` in `Player.css`, preventing horizontal scrollbar clipping.

- [x] **R. Fix Aggressive Text Collapse**
  - Added `min-width: 0;` to `.truncate` in `patterns.css`, `div.metadata` in `StreamItem.css`, and `.listItem div` in `ListItem.css`.

- [x] **S. Group Channels Together in "All" Search Results**
  - Filter "All" partitions channel lockups into a top horizontal carousel (`.list-carousel`), displaying streams below.

- [x] **T. Fix Channels not opening**
  - Fixed channel ID fallback in `ActionsMenu/index.tsx` resolving `authorId` from `playerStore.stream` or raw metadata, closing player into miniplayer and opening channel.

- [x] **U. Fix Tooltip Positioning**
  - Centralized tooltip anchor styling in `tooltips.css` with centered bottom-offset anchor and touch device suppression (`@media (hover: none)`), removing conflicting duplicates from `layout.css`.

- [x] **V. Combine Gallery & Featured into Two Shelves**
  - Featured section renders two shelves: Shelf 1 (Official YT Playlists) and Shelf 2 (Community Playlists). Removed redundant standalone Gallery from Library view.

- [x] **W. Add Artists Shelf to Favorites Collection**
  - Added favorite artists carousel in `List/index.tsx` when viewing Favorites collection, allowing 1-click navigation to artist pages.

- [x] **X. Add Full Metadata access like Artist, Album data access to tracks**
  - Added `albumId` and `albumTitle` to `TrackItem` in `types.d.ts` and populated in `streamMapper`.

- [x] **Y. Normalize Tracks across Cloud Sync + Metadata fixer**
  - Added canonical track upserts in Cloudflare Worker and `CatalogDO`, integrating hydration and metadata normalization.

- [x] **Z. Fix Search>Playlists**
  - Fixed `listMapper` handling in `src/backend/utils.ts` for InnerTube `LockupView` with `content_type === "PLAYLIST"`.
