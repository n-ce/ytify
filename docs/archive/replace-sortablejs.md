# Plan: Replace SortableJS with Native Micro Reorder Handler

**Status:** Completed  
**Date:** 2026-09-26  
**Goal:** Eliminate sortablejs and solid-sortablejs to shed ~13.5 kB gzipped (~38.6 kB uncompressed), which is currently the single largest third-party chunk in the entire application.

---

## 1. Context & Motivation

In ytify's production build output:

```text
dist/assets/dist-*.js     38.64 kB  │ gzip: 13.46 kB   (SortableJS)
```

This single dependency accounts for almost 10% of ytify's total shipped JavaScript and more than half the size of the entire app entry bundle.

However, ytify only uses SortableJS in two specific places:

1. src/features/Queue/List.tsx: Reordering tracks within the active play queue.
2. src/features/List/Results.tsx: Reordering tracks within custom user collections.

Both locations require simple vertical list reordering with a grab handle (.ri-draggable). Bringing in the entire SortableJS ecosystem for this is disproportionately heavy.

---

## 2. Target Design: Native Drag & Drop Micro-Utility

Replace the heavy third-party library with a lightweight, dependency-free utility (~60-80 lines of TypeScript, < 1.5 kB uncompressed, ~0.5 kB gzipped):

### A. Location: src/lib/utils/core.ts (Pure math) + src/lib/modules/sortable.tsx (Module) + src/components/SortableList.tsx (UI wrapper)

- **Pure Core Helper (src/lib/utils/core.ts, alongside the other array helpers):**
  ```ts
  export function reorderItem<T>(
    list: T[],
    fromIndex: number,
    toIndex: number,
  ): T[] {
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }
  ```
- **Component Wrapper (src/lib/modules/sortable.tsx & src/components/SortableList.tsx):**
  A lightweight SolidJS component using native HTML5 Drag and Drop events (dragstart, dragover, drop, dragend) with touch support (touchstart, touchmove, touchend with elementFromPoint) for mobile browsers.

### B. Requirements & Interactions

- **Handle Binding:** Only initiate drag/reorder when touching/dragging elements matching .ri-draggable.
- **Visual Feedback:** Apply CSS drop target highlight class (e.g. is-drop-target or opacity: 0.5 on dragging element).
- **Callback Signature:** Identical contract to current usage: onReorder(items: TrackItem[]) so neither Queue/List.tsx nor List/Results.tsx require business logic changes.
- **Author Grouping Preservation:** Retains if (config.authorGrouping) newList = groupQueueByAuthor(newList) in Queue/List.tsx.

---

## 3. Work Breakdown & Implementation Steps

### Phase 1: Implement Native Sortable Primitive

- [x] Add reorderItem<T> to src/lib/utils/core.ts with test coverage in scripts/core.test.ts.
- [x] Create src/lib/modules/sortable.tsx and src/components/SortableList.tsx using standard HTML5 drag-and-drop and touch coordinates.
- [x] Style smooth dragging feedback in CSS (accent highlight on drop indicator).

### Phase 2: Migrate Consumers

- [x] Replace <Sortable> in src/features/Queue/List.tsx with <SortableList>.
- [x] Replace <Sortable> in src/features/List/Results.tsx with <SortableList>.

### Phase 3: Remove Dependency & Verify

- [x] Remove solid-sortablejs, sortablejs, and @types/sortablejs from package.json.
- [x] Run bun install to prune lockfile.
- [x] Verify queue and collection drag-and-drop reordering manually on Desktop and Mobile touch.
- [x] Run bun run build and measure the elimination of dist-*.js chunk.

---

## 4. Verification & Acceptance Criteria

1. **Bundle Reduction:** dist/assets/dist-*.js (38.64 kB / 13.46 kB gzip) is completely removed from build output.
2. **Total JS Savings:** Net JavaScript download size drops by ~13 kB gzipped.
3. **Queue Reordering:** Dragging track by handle reorders queue reactively; groupQueueByAuthor still applies when enabled.
4. **Collection Reordering:** Dragging track in custom playlist saves new ID order to localStorage via saveCollection.
5. **Mobile Touch Support:** Reorder handles function properly on touch devices.
