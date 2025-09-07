import { createEffect, createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { setNavStore } from "./navigation";

export const [queueStore, setQueueStore] = createStore({
  list: [] as CollectionItem[]
});

createRoot(() => {
  createEffect(() => {
    const { list } = queueStore;
    setNavStore('queue', 'state', Boolean(list.length));
  })
});
