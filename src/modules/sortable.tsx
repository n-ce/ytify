import { For, JSX, onCleanup, onMount } from "solid-js";
import { reorderItem } from "@utils";

interface SortableProps<T> {
  items: T[];
  setItems?: (items: T[]) => void;
  onReorder?: (items: T[]) => void;
  idField?: string;
  animation?: number;
  handle?: string;
  class?: string;
  id?: string;
  children: (item: T, index: () => number) => JSX.Element;
}

// Distance the pointer must travel before a press on the handle becomes a drag.
const DRAG_THRESHOLD = 4;
// Auto-scroll starts when the pointer is this close to the viewport edge.
const EDGE_THRESHOLD = 45;
const SCROLL_SPEED = 8;

function SortableList<T>(props: SortableProps<T>) {
  let containerRef: HTMLDivElement | undefined;
  const handleSelector = () => props.handle || ".ri-draggable";

  const notify = (newItems: T[]) => {
    (props.setItems || props.onReorder)?.(newItems);
  };

  let activeItem: HTMLElement | null = null;
  let fromIndex: number | null = null;
  let dropTarget: HTMLElement | null = null;
  let dropIsAfter = false;
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let activePointerId: number | null = null;
  let scroller: HTMLElement | null = null;
  // Set when a press starts on a handle so the trailing click never reaches
  // the row's click handler (which would start playback).
  let suppressClick = false;

  const clearDropHighlights = () => {
    dropTarget?.classList.remove("is-drop-target", "drop-before", "drop-after");
    containerRef
      ?.querySelectorAll(".is-drop-target, .drop-before, .drop-after")
      .forEach((el) => {
        el.classList.remove("is-drop-target", "drop-before", "drop-after");
      });
  };

  const getDropTargetInfo = (
    clientX: number,
    clientY: number,
  ): { item: HTMLElement; isAfter: boolean } | null => {
    if (!containerRef) return null;
    const el = document.elementFromPoint(clientX, clientY);
    const item = el?.closest<HTMLElement>(".sortable-item");
    if (item && containerRef.contains(item)) {
      const rect = item.getBoundingClientRect();
      const isAfter = clientY > rect.top + rect.height / 2;
      return { item, isAfter };
    }
    const items = containerRef.querySelectorAll<HTMLElement>(".sortable-item");
    if (items.length > 0) {
      const firstRect = items[0].getBoundingClientRect();
      const lastRect = items[items.length - 1].getBoundingClientRect();
      if (clientY < firstRect.top) {
        return { item: items[0], isAfter: false };
      }
      if (clientY > lastRect.bottom) {
        return { item: items[items.length - 1], isAfter: true };
      }
    }
    return null;
  };

  const getScrollParent = (): HTMLElement | null => {
    if (containerRef && containerRef.scrollHeight > containerRef.clientHeight) {
      return containerRef;
    }
    let node = containerRef?.parentElement ?? null;
    while (node) {
      const overflowY = getComputedStyle(node).overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  };

  const handleAutoScroll = (clientY: number) => {
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      if (clientY < rect.top + EDGE_THRESHOLD) {
        scroller.scrollTop -= SCROLL_SPEED;
      } else if (clientY > rect.bottom - EDGE_THRESHOLD) {
        scroller.scrollTop += SCROLL_SPEED;
      }
      return;
    }
    if (clientY < EDGE_THRESHOLD) window.scrollBy(0, -SCROLL_SPEED);
    else if (clientY > window.innerHeight - EDGE_THRESHOLD)
      window.scrollBy(0, SCROLL_SPEED);
  };

  const cleanup = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    clearDropHighlights();
    if (activeItem) {
      activeItem.classList.remove("is-dragging");
      activeItem = null;
    }
    fromIndex = null;
    dropTarget = null;
    dropIsAfter = false;
    isDragging = false;
    activePointerId = null;
    scroller = null;
  };

  const applyReorder = () => {
    if (!isDragging || fromIndex === null || !dropTarget) return;
    const targetIndex = Number(dropTarget.dataset.index);
    if (isNaN(targetIndex)) return;

    const insertIndex = dropIsAfter
      ? fromIndex > targetIndex
        ? targetIndex + 1
        : targetIndex
      : fromIndex < targetIndex
        ? targetIndex - 1
        : targetIndex;
    const clampedIndex = Math.max(
      0,
      Math.min(props.items.length - 1, insertIndex),
    );
    if (clampedIndex !== fromIndex) {
      notify(reorderItem(props.items, fromIndex, clampedIndex));
    }
  };

  // --- Pointer handling (mouse, touch and pen share one code path) ---

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (activeItem) return;
    suppressClick = false;
    const handleEl = (e.target as Element | null)?.closest(handleSelector());
    if (!handleEl) return;
    const itemEl = handleEl.closest<HTMLElement>(".sortable-item");
    if (!itemEl || !containerRef?.contains(itemEl)) return;
    const index = Number(itemEl.dataset.index);
    if (isNaN(index)) return;

    // Stops the browser from starting a native link drag on the row's <a>.
    e.preventDefault();
    scroller = getScrollParent();
    suppressClick = true;
    activeItem = itemEl;
    fromIndex = index;
    startX = e.clientX;
    startY = e.clientY;
    isDragging = false;
    activePointerId = e.pointerId;

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!activeItem || fromIndex === null) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    if (!isDragging) {
      const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (moved < DRAG_THRESHOLD) return;
      isDragging = true;
      activeItem.classList.add("is-dragging");
    }

    e.preventDefault();
    handleAutoScroll(e.clientY);

    const targetInfo = getDropTargetInfo(e.clientX, e.clientY);
    if (!targetInfo || targetInfo.item === activeItem) {
      clearDropHighlights();
      dropTarget = null;
      return;
    }

    if (dropTarget !== targetInfo.item || dropIsAfter !== targetInfo.isAfter) {
      clearDropHighlights();
      dropTarget = targetInfo.item;
      dropIsAfter = targetInfo.isAfter;
      targetInfo.item.classList.add("is-drop-target");
      targetInfo.item.classList.add(
        targetInfo.isAfter ? "drop-after" : "drop-before",
      );
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    applyReorder();
    cleanup();
  };

  const onPointerCancel = (e: PointerEvent) => {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    cleanup();
  };

  // A press on the handle must never reach the row's click handler (play item).
  const onHandleClick = (e: MouseEvent) => {
    // detail === 0 means the click came from the keyboard, not the pointer.
    if (!suppressClick || e.detail === 0) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  };

  // The rows are anchors, so the browser would otherwise start a link drag
  // from anywhere in the row. Reordering is handled entirely above.
  const onNativeDragStart = (e: DragEvent) => {
    e.preventDefault();
  };

  onMount(() => {
    if (!containerRef) return;
    containerRef.addEventListener("pointerdown", onPointerDown);
    containerRef.addEventListener("click", onHandleClick, true);
    containerRef.addEventListener("dragstart", onNativeDragStart);
  });

  onCleanup(() => {
    if (containerRef) {
      containerRef.removeEventListener("pointerdown", onPointerDown);
      containerRef.removeEventListener("click", onHandleClick, true);
      containerRef.removeEventListener("dragstart", onNativeDragStart);
    }
    cleanup();
  });

  return (
    <div
      ref={containerRef}
      id={props.id}
      class={`sortable-list${props.class ? ` ${props.class}` : ""}`}
    >
      <For each={props.items}>
        {(item, index) => {
          const id = () => {
            const field = props.idField || "id";
            return (item as Record<string, unknown>)?.[field] ?? index();
          };
          return (
            <div class="sortable-item" data-id={id()} data-index={index()}>
              {props.children(item, index)}
            </div>
          );
        }}
      </For>
    </div>
  );
}

export default SortableList;
