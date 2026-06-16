import { queueStore, setQueueStore, t, setStore } from "@stores";
import { parseDuration } from "@utils";
import getStreamData from "./getStreamData";
import setAudioStreams from "./setAudioStreams";

export const isQueuePrefetchActive = () => queueStore.isSession;

export async function activateQueuePrefetch() {
  const { list } = queueStore;
  const totalSeconds = list.reduce((acc, item) => acc + parseDuration(item.duration), 0);

  if (list.length > 20 || totalSeconds > 3600) {
    setStore('snackbar', t('queue_prefetch_limit_exceeded'));
    return;
  }

  setQueueStore('isSession', true);

  let count = 0;
  const total = list.length;

  for (const track of list) {
    if (!queueStore.isSession) break;
    if (queueStore.sessionMap.has(track.id)) {
      count++;
      continue;
    }

    setStore('snackbar', t('queue_prefetch_activating').replace('$', `${count}/${total}`));

    const data = await getStreamData(track.id);
    if (data && 'adaptiveFormats' in data) {
      const ghost = new Audio();
      ghost.preload = 'auto';

      const formats = data.adaptiveFormats
        .filter(f => f.type.startsWith('audio'))
        .sort((a, b) => (parseInt(a.bitrate) - parseInt(b.bitrate)));

      await setAudioStreams(formats, ghost);
      queueStore.sessionMap.set(track.id, ghost);
    }
    count++;
  }

  if (queueStore.isSession)
    setStore('snackbar', t('queue_prefetch_ready'));
}

export function deactivateQueuePrefetch() {
  queueStore.sessionMap.forEach(audio => {
    audio.src = '';
    audio.load();
  });
  queueStore.sessionMap.clear();
  setQueueStore('isSession', false);
}
