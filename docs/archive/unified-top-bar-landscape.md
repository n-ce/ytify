# Plan: Unified Top Bar & Extended Dynamic Header Navigation

## Overview

Unify navigation and view headers across portrait and landscape orientations without breaking state encapsulation or layout balance:

- In **Landscape**: The top bar spans across both panels:
  - Left panel: Player header (`<header class="topShelf">`) aligned horizontally at the top.
  - Right panel: The view header (`<header class="sticky-bar">`) houses text-based navigation (`[Queue Search Library {ListName}]`) where the list nav item shows the dynamic list name, accompanied by active contextual badges/search inputs, followed by right-group action buttons and dropdowns.
  - The previous icon-only `<NavBar />` at the top of the left panel is removed, allowing the Player layout to occupy full vertical space seamlessly.
- In **Portrait**:
  - The header displays the active feature's title (`.header-title`), preserving in-place search and mark bars.
  - The thumb-reachable bottom navbar (`<NavBar />`) remains for primary navigation.

---

## Architectural Implementation

### 1. `HeaderNav` Component (`src/components/HeaderNav.tsx`)

- Renders dual presentation targets:
  - `.header-title` (active in portrait via media queries): displays `props.title` (standard header text or interactive titles).
  - `.header-nav` (active in landscape via media queries): renders text navigation items:
    - `Queue`
    - `Search`
    - `Library`
    - `{listStore.name || "List"}` (the list title directly doubles as the List navigation tab).
  - Highlights active state with an underline indicator and accent color.
  - Handles navigation clicks matching `NavBar.tsx` behavior (scrolling into view if already active, restoring `drawer.lastList` for collection/playlist, or opening subviews).
  - Provides a `.header-nav-extra` slot for view-specific dynamic items in landscape (such as list in-line search input, queue duration badge, or build version badge).

### 2. Feature Header Integration

All feature headers adopt `HeaderNav` directly inside their existing `<header class="sticky-bar">`:

- **Search** (`src/features/Search/index.tsx`): Integrates `HeaderNav`, keeping fullscreen and settings toggles in `.right-group`.
- **Library** (`src/features/Library/index.tsx`): Integrates `HeaderNav`, maintaining cloud-sync indicators in `.right-group` and `<Dropdown />`.
- **Queue** (`src/features/Queue/index.tsx`): Integrates `HeaderNav` with queue duration badge extra slot in landscape, retaining shuffle and remove mode toggles.
- **List** (`src/features/List/index.tsx`): Integrates `HeaderNav` using the list name as the navigation title; preserves local signals (`isSearching`, `searchQuery`, `markMode`, `showStreamsNumber`) and renders in-line search in landscape.
- **Settings** (`src/features/Settings/index.tsx`): Uses standard `section > header` with close action button and dropdown.

### 3. Layout and Player Alignment (`src/styles/layout.css` & `src/index.tsx`)

- **Player Integrity**: Player component layout in `left-panel` remains untouched. In landscape, `<NavBar />` is removed from `.left-panel` so `<Player />` directly aligns its top shelf header with the right panel header.
- **More Button & Dropdown Alignment**: Dropdown `<details>` inside `section > header` is vertically centered relative to the header line (`top: 50%; transform: translateY(-50%)`), ensuring that `.right-group` and `.ri-more-2-fill` maintain accurate horizontal alignment across view transitions.
- **Responsive Media Rules**:
  - `@media (orientation: portrait)`: `.header-nav { display: none !important; }`, `.header-title { display: flex; }`.
  - `@media (orientation: landscape)`: `.header-title { display: none !important; }`, `.header-nav { display: flex; }`.
