import { For, JSX, onCleanup, onMount } from "solid-js";
import { reorderItem } from "@utils";

export interface SortableProps<T> {
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

export function SortableList<T>(props: SortableProps<T>) {
  let containerRef: HTMLDivElement | undefined;
  const handleSelector = () => props.handle || ".ri-draggable";

  const notify = (newItems: T[]) => {
    (props.setItems || props.onReorder)?.(newItems);
  };

  // State for Desktop HTML5 drag
  let activeDragItem: HTMLElement | null = null;
  let dragFromIndex: number | null = null;
  let currentDropTarget: HTMLElement | null = null;
  let currentIsAfter = false;

  // State for Mobile Touch drag
  let touchActiveItem: HTMLElement | null = null;
  let touchFromIndex: number | null = null;
  let touchTarget: HTMLElement | null = null;
  let touchIsAfter = false;
  let touchStartY = 0;
  let touchHasMoved = false;

  const clearDropHighlights = () => {
    if (currentDropTarget) {
      currentDropTarget.classList.remove(
        "is-drop-target",
        "drop-before",
        "drop-after",
      );
    }
    if (touchTarget) {
      touchTarget.classList.remove(
        "is-drop-target",
        "drop-before",
        "drop-after",
      );
    }
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

  const handleAutoScroll = (clientY: number) => {
    const edgeThreshold = 45;
    const scrollSpeed = 8;
    if (containerRef && containerRef.scrollHeight > containerRef.clientHeight) {
      const cRect = containerRef.getBoundingClientRect();
      if (clientY < cRect.top + edgeThreshold) {
        containerRef.scrollTop -= scrollSpeed;
      } else if (clientY > cRect.bottom - edgeThreshold) {
        containerRef.scrollTop += scrollSpeed;
      }
    } else {
      if (clientY < edgeThreshold) {
        window.scrollBy(0, -scrollSpeed);
      } else if (clientY > window.innerHeight - edgeThreshold) {
        window.scrollBy(0, scrollSpeed);
      }
    }
  };

  const cleanupDrag = () => {
    clearDropHighlights();
    if (activeDragItem) {
      activeDragItem.classList.remove("is-dragging");
      activeDragItem.draggable = false;
      activeDragItem = null;
    }
    dragFromIndex = null;
    currentDropTarget = null;
    currentIsAfter = false;
  };

  const cleanupTouch = () => {
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchCancel);
    clearDropHighlights();
    if (touchActiveItem) {
      touchActiveItem.classList.remove("is-dragging");
      touchActiveItem = null;
    }
    touchFromIndex = null;
    touchTarget = null;
    touchHasMoved = false;
  };

  // --- Desktop Mouse / Drag Handlers ---

  const onMouseDown = (e: MouseEvent) => {
    const handleEl = (e.target as Element).closest(handleSelector());
    if (!handleEl) return;
    const itemEl = handleEl.closest<HTMLElement>(".sortable-item");
    if (!itemEl || !containerRef?.contains(itemEl)) return;
    activeDragItem = itemEl;
    itemEl.draggable = true;
  };

  const onDragStart = (e: DragEvent) => {
    const itemEl = (e.target as HTMLElement).closest<HTMLElement>(
      ".sortable-item",
    );
    if (!itemEl || itemEl !== activeDragItem) {
      e.preventDefault();
      return;
    }
    const from = Number(itemEl.dataset.index);
    if (isNaN(from)) {
      e.preventDefault();
      return;
    }
    dragFromIndex = from;
    e.dataTransfer!.effectAllowed = "move";
    e.dataTransfer!.setData("text/plain", String(from));
    requestAnimationFrame(() => {
      if (activeDragItem) {
        activeDragItem.classList.add("is-dragging");
      }
    });
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (dragFromIndex === null) return;
    e.dataTransfer!.dropEffect = "move";

    const targetInfo = getDropTargetInfo(e.clientX, e.clientY);
    if (!targetInfo || targetInfo.item === activeDragItem) {
      clearDropHighlights();
      currentDropTarget = null;
      return;
    }

    if (
      currentDropTarget !== targetInfo.item ||
      currentIsAfter !== targetInfo.isAfter
    ) {
      clearDropHighlights();
      currentDropTarget = targetInfo.item;
      currentIsAfter = targetInfo.isAfter;
      targetInfo.item.classList.add("is-drop-target");
      targetInfo.item.classList.add(
        targetInfo.isAfter ? "drop-after" : "drop-before",
      );
    }
  };

  const onDragLeave = (e: DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !containerRef?.contains(related)) {
      clearDropHighlights();
      currentDropTarget = null;
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (dragFromIndex !== null && currentDropTarget) {
      const targetIndex = Number(currentDropTarget.dataset.index);
      if (!isNaN(targetIndex)) {
        let insertIndex = currentIsAfter
          ? dragFromIndex > targetIndex
            ? targetIndex + 1
            : targetIndex
          : dragFromIndex < targetIndex
            ? targetIndex - 1
            : targetIndex;
        insertIndex = Math.max(
          0,
          Math.min(props.items.length - 1, insertIndex),
        );
        if (insertIndex !== dragFromIndex) {
          const newItems = reorderItem(props.items, dragFromIndex, insertIndex);
          notify(newItems);
        }
      }
    }
    cleanupDrag();
  };

  const onDragEnd = () => {
    cleanupDrag();
  };

  // --- Mobile Touch Handlers ---

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const handle = target?.closest(handleSelector());
    if (!handle) return;
    const item = handle.closest<HTMLElement>(".sortable-item");
    if (!item || !containerRef?.contains(item)) return;

    touchActiveItem = item;
    touchFromIndex = Number(item.dataset.index);
    touchStartY = touch.clientY;
    touchHasMoved = false;

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("touchcancel", onTouchCancel, { passive: false });
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!touchActiveItem || touchFromIndex === null) return;
    const touch = e.touches[0];
    if (!touchHasMoved) {
      if (Math.abs(touch.clientY - touchStartY) > 5) {
        touchHasMoved = true;
        touchActiveItem.classList.add("is-dragging");
      } else {
        return;
      }
    }

    e.preventDefault();
    handleAutoScroll(touch.clientY);

    const targetInfo = getDropTargetInfo(touch.clientX, touch.clientY);
    if (!targetInfo || targetInfo.item === touchActiveItem) {
      clearDropHighlights();
      touchTarget = null;
      return;
    }

    if (
      touchTarget !== targetInfo.item ||
      touchIsAfter !== targetInfo.isAfter
    ) {
      clearDropHighlights();
      touchTarget = targetInfo.item;
      touchIsAfter = targetInfo.isAfter;
      targetInfo.item.classList.add("is-drop-target");
      targetInfo.item.classList.add(
        targetInfo.isAfter ? "drop-after" : "drop-before",
      );
    }
  };

  const onTouchEnd = () => {
    if (
      touchActiveItem &&
      touchHasMoved &&
      touchFromIndex !== null &&
      touchTarget
    ) {
      const targetIndex = Number(touchTarget.dataset.index);
      if (!isNaN(targetIndex)) {
        let insertIndex = touchIsAfter
          ? touchFromIndex > targetIndex
            ? targetIndex + 1
            : targetIndex
          : touchFromIndex < targetIndex
            ? targetIndex - 1
            : targetIndex;
        insertIndex = Math.max(
          0,
          Math.min(props.items.length - 1, insertIndex),
        );
        if (insertIndex !== touchFromIndex) {
          const newItems = reorderItem(
            props.items,
            touchFromIndex,
            insertIndex,
          );
          notify(newItems);
        }
      }
    }
    cleanupTouch();
  };

  const onTouchCancel = () => {
    cleanupTouch();
  };

  onMount(() => {
    if (!containerRef) return;
    containerRef.addEventListener("mousedown", onMouseDown);
    containerRef.addEventListener("dragstart", onDragStart);
    containerRef.addEventListener("dragover", onDragOver);
    containerRef.addEventListener("dragleave", onDragLeave);
    containerRef.addEventListener("drop", onDrop);
    containerRef.addEventListener("dragend", onDragEnd);
    containerRef.addEventListener("touchstart", onTouchStart, {
      passive: true,
    });
  });

  onCleanup(() => {
    if (containerRef) {
      containerRef.removeEventListener("mousedown", onMouseDown);
      containerRef.removeEventListener("dragstart", onDragStart);
      containerRef.removeEventListener("dragover", onDragOver);
      containerRef.removeEventListener("dragleave", onDragLeave);
      containerRef.removeEventListener("drop", onDrop);
      containerRef.removeEventListener("dragend", onDragEnd);
      containerRef.removeEventListener("touchstart", onTouchStart);
    }
    cleanupDrag();
    cleanupTouch();
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

export const Sortable = SortableList;
export default SortableList;
