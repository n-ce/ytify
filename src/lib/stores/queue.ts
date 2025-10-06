import { createEffect, createRoot } from "solid-js";
import { createStore } from "solid-js/store";

export const [queueStore, setQueueStore] = createStore({
  list: [] as CollectionItem[]
});

createRoot(() => {
  createEffect(() => {
    const { list } = queueStore;
    console.log(list);
  })
});
