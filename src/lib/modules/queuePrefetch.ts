import { createSignal } from 'solid-js';
import { queueStore, t, setStore } from "@stores";
import { parseDuration } from "@utils";
import getStreamData from "./getStreamData";
import setAudioStreams from "./setAudioStreams";

export const [isQueuePrefetchActive, setIsQueuePrefetchActive] = createSignal(false);

export const queuePrefetchState = {
  map: new Map<string, HTMLAudioElement>()
};

export async function activateQueuePrefetch() {
  const { list } = queueStore;
  const totalSeconds = list.reduce((acc, item) => acc + parseDuration(item.duration), 0);

  if (list.length > 20 || totalSeconds > 3600) {
    setStore('snackbar', t('queue_prefetch_limit_exceeded'));
    return;
  }

  setIsQueuePrefetchActive(true);
  setStore('snackbar', t('queue_prefetch_activating'));

  for (const track of list) {
    if (!isQueuePrefetchActive()) break;
    if (queuePrefetchState.map.has(track.id)) continue;

    const data = await getStreamData(track.id, true);
    if (data && 'adaptiveFormats' in data) {
      const ghost = new Audio();
      ghost.preload = 'auto';
      
      const formats = data.adaptiveFormats
        .filter(f => f.type.startsWith('audio'))
        .sort((a, b) => (parseInt(a.bitrate) - parseInt(b.bitrate)));
      
      await setAudioStreams(formats, ghost);
      queuePrefetchState.map.set(track.id, ghost);
    }
  }

  if (isQueuePrefetchActive())
    setStore('snackbar', t('queue_prefetch_ready'));
}

export function deactivateQueuePrefetch() {
  queuePrefetchState.map.forEach(audio => { audio.src = ''; audio.load(); });
  queuePrefetchState.map.clear();
  setIsQueuePrefetchActive(false);
}
