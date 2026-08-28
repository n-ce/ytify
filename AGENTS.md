# AGENTS.md

## Application Architecture & Development Guidelines

This document serves as the comprehensive architectural reference, design specification, and coding standard for **ytify**.

---

## 1. Executive Summary & Core Philosophy

**ytify** is a lightweight, high-performance, client-side web application for streaming music and videos powered by YouTube, Piped, and Invidious sources. Built with **SolidJS** and **TypeScript**, it prioritizes zero superfluous re-renders, minimal bundle overhead, and an adaptive layout across portrait (mobile) and landscape (desktop/tablet) screens.

### Core Architectural Principles

- **Fine-Grained Reactivity**: Use SolidJS reactive primitives (`createSignal`, `createEffect`, `createMemo`, stores) without virtual DOM overhead.
- **Component Lifecycle & Visibility**: Components must be conditionally mounted/unmounted using SolidJS reactive control flow (`<Show>`, `<Switch>`, `<Match>`), never hidden via CSS (`display: none`, `visibility: hidden`) unless managing hardware-accelerated media elements.
- **Zero Global App Bars**: The application contains no global navigation bars (no bottom navbar, no persistent global top bar). All navigation flows through in-view headers and dual-panel interactions.
- **Optimized Assets**: RemixIcon glyphs are custom-subsetted for size and performance; only use valid subset icon classes (e.g., `ri-search-2-line`, `ri-close-large-line`).

---

## 2. State Management & Module Architecture

### Store Hierarchy

- **`src/lib/stores/player.ts`**: Manages media playback lifecycle, HTML audio/video elements, playback speeds, track position/duration, volume, and immersive mode.
- **`src/lib/stores/queue.ts`**: Handles active queue, playback history, upcoming tracks, shuffle algorithms, and batch queue mutations.
- **`src/lib/stores/navigation.ts` & `src/lib/stores/app.ts`**: Coordinates dual-panel active states, sub-views, drawers, and viewport responsive triggers.

### Circular Dependency Prevention

- Core utilities (`src/lib/utils/config.ts`, `src/lib/utils/image.ts`) must remain decoupled from reactive stores (`src/lib/stores/*`).
- Avoid importing stores inside pure configuration utilities. Panel ratio DOM setters and configuration readers should be isolated to prevent initialization reference errors (`ReferenceError: Cannot access before initialization`).

---

## 3. Dual-Panel Screen Architecture

The application is strictly partitioned into two primary screens/panels:

- **Left Panel (Player Panel)**: Houses playback controls, media details/artwork, lyrics, video renderer, and the integrated scrollable queue.
- **Right Panel (Library Panel)**: Houses library collections (playlists, history, saved streams) and serves as the mounting root for Right Panel sub-views.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Dual-Panel Layout Model                         │
├───────────────────────────────────┬────────────────────────────────────┤
│            Left Panel             │            Right Panel             │
│          (Player Screen)          │          (Library Screen)          │
│ ───────────────────────────────── │ ────────────────────────────────── │
│  • Media Artwork & Details        │  • Default View: Library           │
│  • Playback Controls & Scrubber   │  • Sub-views: Search, List,        │
│  • Lyrics / Video Stream Target   │    Settings (pushed via history)   │
│  • Integrated Scrollable Queue    │  • Header: Search, Fullscreen,     │
│  • Sticky Queue Header & Tools    │    Settings controls               │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 4. Screen Behavior Across Viewports & Orientations

### A. Portrait Mode (Mobile / Narrow Viewport)

- **Horizontal Scroll Snapping**: Left and Right panels are arranged horizontally using native CSS scroll snapping (`scroll-snap-type: x mandatory`).
- **Touch Gesture Navigation**: Users swipe horizontally between the Player (left) and Library/sub-views (right).
- **MiniPlayer Visibility (`IntersectionObserver`)**:
  - When the **Right Panel** is visible and audio playback is active, the MiniPlayer renders docked at the viewport bottom.
  - When the **Left Panel** (Player) is scrolled into view, the MiniPlayer unmounts/hides automatically, revealing full player controls and the queue.

### B. Landscape Mode (Desktop / Tablet)

- **Persistent Side-by-Side View**: Both panels are rendered simultaneously.
- **MiniPlayer Suppression**: The MiniPlayer is strictly disabled/unmounted in landscape mode.
- **Configurable Panel Width Ratios**:
  - The width split between Left and Right panels is user-configurable via Settings (default: `2:5`).
  - Supported split ratios: `1:1`, `2:3`, `3:4`, `1:2`, `2:5`.
  - Stored persistently and applied dynamically via CSS variables (e.g., `--player-ratio`, `--sub-ratio`).

---

## 5. Right Panel Navigation & Sub-View History Contract

### Navigation Hierarchy

- **Root Screen**: Library is the default root view of the Right Panel.
- **Sub-Views**:
  - **Search**: Opened via the search button in the Library header.
  - **Settings**: Opened via the settings button in the Library header.
  - **List**: Displays playlists, albums, artist channels, and search result items.

### History & Back Navigation Contract

- Opening any sub-view (Search, Settings, List) must perform a **history push** (`history.pushState` / router push).
- Triggering the browser/device **back button** (or header back action) pops the history state, closes the active sub-view, and restores the Library screen without disrupting media playback.

---

## 6. Codebase CSS Standards & Nesting Rules

To maintain maintainability and avoid flat stylesheet inflation, all stylesheets must adhere to native CSS nesting conventions:

### A. Native CSS Nesting (`&` and Direct Combinators)

- Stylesheets must use native CSS Nesting with direct child combinators (`>`) and parent references (`&`).
- Avoid writing flat, repetitive selector chains.

```css
/* ❌ VIOLATION: Flat CSS selectors with repeated prefixes */
.player-queue-section { ... }
.player-queue-section p { ... }
.player-queue-section .right-group { ... }
.player-queue-section details { ... }
.player-queue-section details summary { ... }

/* ✅ CODEBASE STANDARD: Clean CSS Nesting */
.player-queue-section {
  > header {
    position: sticky;
    top: 0;
    z-index: 10;

    > p {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .right-group {
      margin-left: auto;
      display: flex;
      gap: var(--gap-sm);
    }

    details {
      summary {
        cursor: pointer;
      }
      .queuetools {
        position: absolute;
      }
    }
  }
}
```

### B. Consolidated Media Queries

- Consolidate portrait and landscape media query overrides into cohesive blocks rather than fragmenting rules across disparate selectors.

---

## 7. Unified Header Architecture (`header.sticky-bar`)

All feature views (`Library`, `List`, `Search`, and the integrated `Player Queue`) must inherit and adhere to the canonical header layout pattern defined in `src/styles/layout.css`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Canonical Header Pattern                        │
├────────────────────────────────────────────────────────────────────────┤
│ <header class="sticky-bar">                                            │
│   <p>Title / Counter</p>                 ───> flex-grow / calc width   │
│   <div class="right-group">...</div>     ───> margin-left: auto        │
│   <Dropdown />                           ───> position: absolute;      │
│ </header>                                     top: var(--gap); right: 0│
└────────────────────────────────────────────────────────────────────────┘
```

### Header Design Rules

1. **Semantic Element**: Always use `<header class="sticky-bar">` inside feature sections.
2. **Title / Counter**: Placed directly as `> p` within `<header>` with text ellipsis truncation.
3. **Action Button Groups**: Group actions within `.right-group` (`margin-left: auto`, `display: flex`, `gap: var(--gap-sm)`).
4. **Dropdown / Tool Menus**: Render tool menus using `<details>` / `<Dropdown />` anchored relative to the header.
5. **Glassmorphism & Backdrop Blur**: Use shared `.sticky-bar` backdrop filters and transparency variables rather than declaring ad-hoc blur rules.

---

## 8. Player Screen & Integrated Queue Specifications

- **Integrated Layout**: The queue is embedded directly inside the Player container beneath the playback controls, artwork, and media metadata.
- **Scroll Behavior**: Scrolling down inside the Player view reveals the queue list.
- **Sticky / Floating Queue Header**:
  - Uses the semantic `<header class="sticky-bar">` (or `.player-queue-section > header`).
  - Displays queue duration, track count, shuffle toggle, clear/remove actions, and dropdown tools.
  - Floats cleanly without breaking container boundaries or obscuring active scrubber sliders.
- **Dropdown Menu**: Tool popups (e.g., `.queuetools`) anchor above/below the header with no layout shifting or horizontal overflow.

---

## 9. Library, Search & Settings Specifications

- **Library Header Controls**:
  - Search Button (pushes Search sub-view).
  - Fullscreen Toggle Button.
  - Settings Button (pushes Settings sub-view).
- **Search Screen**: Focused solely on query inputs, suggestions, and query result lists.
- **Settings Screen**:
  - Houses the **Landscape Panel Ratio Selector** (`1:1`, `2:3`, `3:4`, `1:2`, `2:5`).
  - Contains **About / App Information** moved to the bottom of the Settings view.

---

## 10. Code Health & Anti-Patterns to Avoid

- **No Orphaned Feature Components / Routes**:
  - Do not maintain unused legacy routing (e.g., separate standalone queue side-panel routes) when functionality is integrated into a primary panel.
- **No Duplicate Tool & Dropdown Styles**:
  - Reuse global popup/dropdown styling (`details > ul`, `.dropdown-menu`) instead of writing bespoke dropdown styling for individual features.
- **No Hardcoded Ad-Hoc Spacers**:
  - Always utilize design tokens from `global.css` (`var(--gap)`, `var(--gap-sm)`, `var(--roundness)`, `var(--bg-color)`).
