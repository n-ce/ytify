import { createStore } from "solid-js/store";
import { config } from "@lib/utils";

export const [queueStore, setQueueStore] = createStore({
  list: [] as CollectionItem[],
});


export function addToQueue(items: CollectionItem[]) {
  let itemsToAdd = config.allowDuplicates
    ? items
    : items.filter(item => !queueStore.list.some(existingItem => existingItem.id === item.id));

  if (config.filterLT10) {
    itemsToAdd = itemsToAdd.filter(item => {
      const durationParts = item.duration.split(':').map(Number);
      let durationInSeconds = 0;
      if (durationParts.length === 3) {
        durationInSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
      } else if (durationParts.length === 2) {
        durationInSeconds = durationParts[0] * 60 + durationParts[1];
      }
      return durationInSeconds < 600;
    });
  }

  if (config.shuffle) {
    for (let i = itemsToAdd.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [itemsToAdd[i], itemsToAdd[j]] = [itemsToAdd[j], itemsToAdd[i]];
    }
  }

  setQueueStore('list', list => [...list, ...itemsToAdd]);
}
