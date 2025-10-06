
import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import { navStore, setNavStore } from "./navigation";

export const [queueStore, setQueueStore] = createStore({
  list: [] as CollectionItem[],
});

createEffect(() => {
  if (!navStore.player.state)
    if (queueStore.list.length)
      if (!navStore.queue.state)
        setNavStore('queue', 'state', true);

})
