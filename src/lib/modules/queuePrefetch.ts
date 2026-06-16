import { createSignal } from 'solid-js';
import { queueStore, t, setStore } from "@stores";
import { parseDuration } from "@utils";
import getStreamData from "./getStreamData";

export const [isQueuePrefetchActive, setIsQueuePrefetchActive] = createSignal(false);

export async function activateQueuePrefetch() {
  const { list } = queueStore;
  const totalSeconds = list.reduce((acc, item) => acc + parseDuration(item.duration), 0);

  if (list.length > 20 || totalSeconds > 3600) {
    setStore('snackbar', t('queue_prefetch_limit_exceeded'));
    return;
  }

  setIsQueuePrefetchActive(true);

  let count = 0;
  const total = list.length;

  for (const track of list) {
    if (!isQueuePrefetchActive()) break;
    setStore('snackbar', t('queue_prefetch_activating').replace('$', `${count}/${total}`));
    await getStreamData(track.id, true);
    count++;
  }

  if (isQueuePrefetchActive())
    setStore('snackbar', t('queue_prefetch_ready'));
}

export function deactivateQueuePrefetch() {
  setIsQueuePrefetchActive(false);
}
