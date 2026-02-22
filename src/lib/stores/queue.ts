import { createStore } from "solid-js/store";
import { config, convertSStoHHMMSS, parseDuration } from "@utils";

export const [queueStore, setQueueStore] = createStore({
  list: [] as TrackItem[],
  removeMode: false,
  isLoading: false,
});


export function filterItemsByConfig(items: TrackItem[], options: { ignoreList?: TrackItem[], ignoreConfig?: boolean } = {}): TrackItem[] {
  if (options.ignoreConfig) return items;

  let filtered = items;

  if (!config.allowDuplicates && options.ignoreList) {
    filtered = filtered.filter(item => !options.ignoreList!.some(existingItem => existingItem.id === item.id));
  }

  if (config.durationFilter) {
    const limitInSeconds = parseDuration(config.durationFilter);
    filtered = filtered.filter(item => parseDuration(item.duration) < limitInSeconds);
  }

  if (config.authorGrouping) {
    filtered = groupQueueByAuthor(filtered);
  }

  return filtered;
}

export function addToQueue(items: TrackItem[], options: { replace?: boolean, prepend?: boolean, ignoreConfig?: boolean } = {}) {
  let itemsToAdd = items;

  if (!config.allowDuplicates && !options.replace && !options.ignoreConfig) {
    itemsToAdd = items.filter(item => !queueStore.list.some(existingItem => existingItem.id === item.id));
  }

  if (config.durationFilter && !options.ignoreConfig) {
    const limitInSeconds = parseDuration(config.durationFilter);
    itemsToAdd = itemsToAdd.filter(item => parseDuration(item.duration) < limitInSeconds);
  }

  if (config.persistentShuffle && !options.ignoreConfig) {
    for (let i = itemsToAdd.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [itemsToAdd[i], itemsToAdd[j]] = [itemsToAdd[j], itemsToAdd[i]];
    }
  }

  setQueueStore('list', list => {
    let newList: TrackItem[];
    if (options.replace) {
      newList = itemsToAdd;
    } else if (options.prepend) {
      newList = [...itemsToAdd, ...list];
    } else {
      newList = [...list, ...itemsToAdd];
    }

    if (config.authorGrouping && !options.ignoreConfig) {
      return groupQueueByAuthor(newList);
    }
    return newList;
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
      let i = 0;
      while (i < remaining.length) {
        if (remaining[i].author === current.author) {
          result.push(remaining.splice(i, 1)[0]);
        } else {
          i++;
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
