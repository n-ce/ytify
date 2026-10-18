# UI Systems & Invariants

This document establishes the UI design opinions and layout standards across the ytify interface.

---

## 1. Non-Negotiable Invariants

### 1.1 Hub & Shelf Article Container Standard

- All library hub sections and shelf displays are structured as `<article class="*-article">`.
- In `src/features/Library/Library.css`, the global layout rule states:
  ```css
  article > div {
    display: flex;
    border-radius: var(--roundness);
    background-color: var(--onBg);
    border: var(--border);
    margin: var(--size-2) 0;
    overflow: hidden;
  }
  ```
- **Fallback / Empty States**:
  When a shelf is empty (e.g., SubFeed without subscriptions, Featured without history), the fallback message **MUST ALWAYS** be enclosed within a container `<div>`:
  ```tsx
  <Show
    when={hasItems}
    fallback={
      <div>
        <p class="fallback">{t("hub_*_fallback")}</p>
      </div>
    }
  >
  ```
  Rendering bare `<p class="fallback">` directly without the wrapping `<div>` is strictly forbidden. It drops the container background card and violates the visual hierarchy across shelves.
- **Loading State**:
  The loading indicator must likewise be wrapped in `<div class="loading-container"><i class="ri-loader-3-line loading-spinner"></i></div>`.

### 1.2 Player Background Rendering

- Player background modes: `none`, `frost`, `frost-motion`, `blur`, `blur-motion`.
- In blurred modes (`.bg-blur`, `.bg-blur-motion`), the artwork image is scaled with `height: 80%` so that the bottom edge terminates where the gradient transition begins.
- In blurred non-motion mode (`.bg-blur`) and frost non-motion mode (`.bg-frost`), the background artwork is centered horizontally on the player element using `--player-bp: -${Math.floor((offsetHeight - offsetWidth) / 2)}px 0`, matching the exact framing of motion mode at half duration (`seconds / fullDuration = 0.5`).
- In motion modes (`.bg-blur-motion`, `.bg-frost-motion`), the background pans horizontally from left to right with playback progress via `--player-bp: -${Math.floor((seconds / fullDuration) * (offsetHeight - offsetWidth))}px 0`.

### 1.3 Text Collapse & Truncation Invariant

- Every flex container hosting truncated child text (`.truncate`, `div.metadata`, `.listItem div`) must specify `min-width: 0`.
- This prevents premature text collapse into ellipses (`...`) when horizontal space is available.

### 1.4 Tooltip Positioning & Overflow Safety

- **Vertical Directionality**:
  - Header and top-bar icon tooltips default to **below** the icon (`top: calc(100% + var(--size-1)); bottom: auto;`) so they never render off the top of the browser viewport or get clipped by container overflows.
  - Bottom navigation bars and player controls (`nav.app-navbar`, `.miniplayer`, `#playerSection article`, `.playerControls`, `.controls`, `.bottomShelf`, `.mainShelf`) position tooltips **above** the icon (`bottom: calc(100% + var(--size-1)); top: auto;`).
- **Horizontal Edge Alignment**:
  - Right-anchored icons (`.right-group`, `.header-actions`, `.header-nav-extra`, `header details summary`, `header .ri-more-2-fill`, `nav.app-navbar > :last-child`, etc.) anchor to the right edge (`right: 0; left: auto; --tt-x: 0;`), expanding inward to the left so tooltips never bleed off screen.
  - Left-anchored icons (`.sticky-bar > :first-child`, `.markBar > :first-child`, `nav.app-navbar > :first-child`, etc.) anchor to the left edge (`left: 0; right: auto; --tt-x: 0;`), expanding inward to the right.
  - Centered default icons use `left: 50%; right: auto; --tt-x: -50%;`.
- **Viewport Boundary Safety**:
  - Tooltips enforce `max-width: min(calc(100vw - var(--size-6)), 300px); overflow: hidden; text-overflow: ellipsis;` to guarantee tooltips never cause horizontal overflow or off-screen truncation on narrow viewports.
- **StreamItem Containment**:
  - `.streamItem` enforces `overflow: hidden;` so that the oversized corner tap target of the more button (`.streamItem i`) is clipped neatly within the item card and never exceeds the stream item boundaries.
  - Tooltips on `.streamItem :is(i, button)[aria-label]::after` are suppressed (`display: none !important;`) to keep row boundaries intact while maintaining accessibility attributes.
- **Touch & State Suppression**:
  - Tooltips are strictly disabled on touch devices via `@media (hover: none) { :is(i, button)[aria-label]::after { display: none !important; } }`.
  - Tooltips are hidden on active click (`:active`) and when parent dropdown menus are open (`details[open] > summary :is(i, button)[aria-label]::after { display: none !important; }`).

---

## 2. Navigation & Playback Keyboard Controls

ytify enforces strict single-key navigation and web music playback shortcuts in `src/index.tsx`:

- **Active Form Field Suppression**: All shortcuts are strictly suppressed when focus is within `INPUT`, `TEXTAREA`, `SELECT`, `[contenteditable]`, or active dialog overlays.
- **Navigation Shortcuts**:
  - `1`: Queue view
  - `2`: Search view
  - `3`: Library view
  - `/`: Focus search input (clearing query)
- **Playback Shortcuts**:
  - `Space`: Play / Pause toggle
  - `ArrowLeft` / `ArrowRight`: Seek backward / forward 5 seconds
  - `Shift + ArrowRight` / `Shift + N` / `]`: Next track
  - `Shift + ArrowLeft` / `Shift + P` / `[`: Previous track
  - `ArrowUp` / `ArrowDown`: Volume +/- 5%
  - `M`: Mute / Unmute
