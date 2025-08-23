import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import { setNavStore } from "./navigation";

export const [queueStore, setQueueStore] = createStore({
  list: [] as CollectionItem[]
});


createEffect(() => {
  const { list } = queueStore;
  setNavStore('features', 'queue', { state: Boolean(list.length) })
})
