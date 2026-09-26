# Plan: Unified Top Bar for Landscape Mode

## Overview
Combine the Navbar and feature headers into a single unified top bar that only appears in landscape orientation. The nav buttons become the header text (icon + text unified), and header actions adapt based on the active feature.

## Current Architecture Analysis

### Landscape Layout (from `src/index.tsx:183-296`)
- Two-panel layout: `left-panel` (player + NavBar) and `right-panel` (feature views)
- NavBar at top of left-panel (line 220-226)
- Each feature view has its own `header.sticky-bar` (Library, Search, Queue, List)

### NavBar (src/components/NavBar.tsx)
- 4 icon-only buttons: Queue, Search, Library, List
- Active state indicated by `.on` class
- Click handlers: scroll to top if active, else switch view

### Feature Headers (sticky-bar pattern)
Each feature has a `header.sticky-bar` with:
- **Library**: Title + sync button + Dropdown
- **Search**: Title + fullscreen/settings buttons
- **Queue**: Dynamic title (queue name/duration) + shuffle/remove mode + Dropdown
- **List**: Dynamic title (list name/streams count) + mark mode/search toggle + Dropdown + sort bar

## Design Goals
1. **Single unified bar** at top of viewport in landscape
2. **Nav buttons become header** - icon + text in same position
3. **Context-aware actions** - right side actions change per feature
4. **Zero bloat** - reuse existing components, no new deps
5. **Responsive** - only in landscape; portrait keeps current behavior

## Implementation Plan

### Phase 1: Create UnifiedTopBar Component
**File:** `src/components/UnifiedTopBar.tsx`

**Props:**
```typescript
interface UnifiedTopBarProps {
  activeView: keyof typeof navStore; // "queue" | "search" | "library" | "list" | "settings" | "player"
  featureActions: JSX.Element; // Dynamic right-group from active feature
}
```

**Structure:**
```tsx
<nav class="unified-top-bar">
  <div class="nav-buttons">
    {NAV_ITEMS.map(item => (
      <button
        class={activeView === item.key ? "active" : ""}
        onclick={() => handleNavClick(item.key)}
      >
        <i class={item.icon} />
        <span>{t(item.labelKey)}</span>
      </button>
    ))}
  </div>
  <div class="feature-actions">
    {props.featureActions}
  </div>
</nav>
```

**Nav Items Config:**
```ts
const NAV_ITEMS = [
  { key: "queue", icon: "ri-order-play-fill", labelKey: "nav_queue" },
  { key: "search", icon: "ri-search-2-fill", labelKey: "nav_search" },
  { key: "library", icon: "ri-archive-stack-fill", labelKey: "nav_library" },
  { key: "list", icon: "ri-play-list-2-fill", labelKey: "nav_list" },
] as const;
```

### Phase 2: Extract Feature Action Components
Create small components for each feature's right-group actions to be passed to UnifiedTopBar:

| Feature | Component | Source |
|---------|-----------|--------|
| Library | `LibraryHeaderActions` | `src/features/Library/index.tsx:43-72` |
| Search | `SearchHeaderActions` | `src/features/Search/index.tsx:31-46` |
| Queue | `QueueHeaderActions` | `src/features/Queue/index.tsx:24-50` |
| List | `ListHeaderActions` | `src/features/List/index.tsx:212-233` |
| Settings | `SettingsHeaderActions` | (new, minimal) |
| Player | `PlayerHeaderActions` | (new, minimal) |

Each exports a component returning the right-group JSX.

### Phase 3: Wire into App Layout
**Modify `src/index.tsx`:**

1. Import `UnifiedTopBar` and feature action components
2. In landscape (`!isPortrait()`), render `UnifiedTopBar` at top of `main` (above panels)
3. Pass current `navStore.active` and resolved feature actions
4. Remove NavBar from left-panel in landscape
5. Remove `header.sticky-bar` from each feature view in landscape (conditional)

**Conditional rendering in features:**
```tsx
// In each feature view
<Show when={isPortrait()}>
  <header class="sticky-bar">...</header>
</Show>
```

Need to provide `isPortrait` context - either via store or props.

### Phase 4: Styling (`src/styles/layout.css` additions)

```css
/* Unified Top Bar - Landscape Only */
@media (orientation: landscape) {
  main {
    /* Add padding-top for fixed bar */
    padding-top: var(--unified-bar-height, 56px);
  }

  .unified-top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--unified-bar-height, 56px);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 var(--gap);
    background: rgb(from var(--onBg) r g b / 0.6);
    backdrop-filter: blur(var(--size-px-3));
    z-index: 20;
    border-bottom: var(--border);
  }

  .unified-top-bar .nav-buttons {
    display: flex;
    gap: var(--size-1);
  }

  .unified-top-bar .nav-buttons button {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    padding: var(--size-1) var(--size-3);
    border-radius: var(--roundness);
    background: none;
    border: none;
    color: var(--text);
    font-size: var(--font-size-2);
    font-weight: var(--font-weight-5);
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s, background 0.2s;
  }

  .unified-top-bar .nav-buttons button:hover {
    opacity: 1;
    background: var(--onBg2);
  }

  .unified-top-bar .nav-buttons button.active {
    opacity: 1;
    background: var(--scheme);
    color: var(--bg);
  }

  .unified-top-bar .feature-actions {
    display: flex;
    align-items: center;
    gap: var(--size-2);
  }

  /* Hide old navbars in landscape */
  .left-panel nav.app-navbar,
  .right-panel nav.app-navbar {
    display: none;
  }

  /* Hide feature sticky-bars in landscape */
  section > header.sticky-bar {
    display: none;
  }
}
```

### Phase 5: Cleanup & Polish
- Remove `nav.app-navbar` landscape styles (lines 189-209 in layout.css)
- Remove `header.sticky-bar` landscape overrides if any
- Test all 6 views: Queue, Search, Library, List, Settings, Player
- Ensure keyboard navigation works
- Verify touch targets meet accessibility minimums

## Migration Strategy (Incremental)

1. **Step 1:** Create `UnifiedTopBar` + action components (no integration yet)
2. **Step 2:** Add CSS for unified bar (hidden by default)
3. **Step 3:** Wire into `App.tsx` behind a feature flag or `isPortrait` check
4. **Step 4:** Remove old NavBar from landscape in left-panel
5. **Step 5:** Conditionally hide feature headers in landscape
6. **Step 6:** Remove dead CSS

## Open Questions / Polish Items

1. **Player view in landscape:** Currently no header. What actions? (minimize, close?)
2. **Settings view:** Currently no header. Needs back navigation?
3. **Transition animations:** Slide/fade between feature actions?
4. **Long list names:** Truncate with ellipsis in unified bar?
5. **Search input:** Should Search feature show inline search in unified bar?
6. **Dropdown menus:** Ensure z-index works with fixed bar

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/UnifiedTopBar.tsx` | Create |
| `src/features/Library/HeaderActions.tsx` | Create (extract) |
| `src/features/Search/HeaderActions.tsx` | Create (extract) |
| `src/features/Queue/HeaderActions.tsx` | Create (extract) |
| `src/features/List/HeaderActions.tsx` | Create (extract) |
| `src/features/Settings/HeaderActions.tsx` | Create |
| `src/features/Player/HeaderActions.tsx` | Create |
| `src/index.tsx` | Modify (wire up) |
| `src/styles/layout.css` | Modify (add unified bar styles, remove old) |
| Feature view files | Modify (conditional header) |

## Estimate
- **Component creation:** ~2 hours
- **Integration & testing:** ~2 hours
- **CSS & polish:** ~1 hour
- **Total:** ~5 hours