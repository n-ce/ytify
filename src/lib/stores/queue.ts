import { createStore } from "solid-js/store";
import { createEffect, createRoot, untrack } from "solid-js";
import { config, convertSStoHHMMSS, parseDuration, shuffle } from "@utils";
import { playerStore } from "./player";

export const [queueStore, setQueueStore] = createStore({
  list: [] as TrackItem[],
  history: [] as TrackItem[],
  removeMode: false,
  isLoading: false,
});

createRoot(() => {
  let bypass = false;

  createEffect(() => {
    const list = queueStore.list;
    const isShuffleOn = config.persistentShuffle;
    const isGroupingOn = config.authorGrouping;

    if (bypass) {
      bypass = false;
      return;
    }

    // Process if shuffle/grouping is on and we have items.
    // We now process even on removals (like playNext) to ensure the remaining list is always randomized/grouped.
    if ((isShuffleOn || isGroupingOn) && list.length > 1) {
      untrack(() => {
        let newList = [...list];
        if (isShuffleOn) newList = shuffle(newList);
        if (isGroupingOn) newList = groupQueueByAuthor(newList);

        bypass = true;
        setQueueStore('list', newList);
      });
    }
  });
});
/**
 * Filter items based on configuration and state.
 * By default blocks duplicates in queue/history and respects duration.
 * Items with context.src === '' bypass these filters (manual user intent).
 */
export function filterItemsByConfig(items: TrackItem[], options: {
  ignoreList?: TrackItem[]
} = {}): TrackItem[] {

  const historyIds = new Set(queueStore.history.map(i => i.id));
  const queueIds = new Set(queueStore.list.map(i => i.id));
  const ignoreIds = new Set(options.ignoreList?.map(i => i.id) || []);
  const currentId = playerStore.stream.id;
  const durationLimit = config.durationFilter ? parseDuration(config.durationFilter) : Infinity;

  return items.filter(item => {
    if (!item.id) return false;

    // Manual intent override: if src is exactly '', we allow it regardless of filters.
    if (item.context?.src === '') return true;

    return item.id !== currentId &&
      !queueIds.has(item.id) &&
      !historyIds.has(item.id) &&
      !ignoreIds.has(item.id) &&
      parseDuration(item.duration) < durationLimit;
  });
}

/**
 * Main entry point for adding items to the queue.
 */
export function addToQueue(items: TrackItem[], options: {
  replace?: boolean,
  prepend?: boolean
} = {}) {
  // Items with context.src === '' bypass all config filters
  let itemsToAdd = filterItemsByConfig(items);

  setQueueStore('list', prevList => {
    const combined = options.replace ? itemsToAdd : (options.prepend ? [...itemsToAdd, ...prevList] : [...prevList, ...itemsToAdd]);
    return combined;
  });
}

export function groupQueueByAuthor(list: TrackItem[]): TrackItem[] {
  if (list.length <= 1) return [...list];
  const result: TrackItem[] = [];
  const remaining = [...list];

  while (remaining.length > 0) {
    const current = remaining.shift()!;
    result.push(current);
    if (current.author) {
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].author === current.author) {
          result.push(remaining.splice(i, 1)[0]);
          i--;
        }
      }
    }
  }
  return result;
}

export function totalQueueDuration(list: TrackItem[]): string {
  if (list.length === 0) return '';
  const totalSeconds = list.reduce((acc, item) => acc + parseDuration(item.duration), 0);
  return convertSStoHHMMSS(totalSeconds);
}
