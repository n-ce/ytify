import { setStore, store } from '@lib/stores/app.ts';
import { playerStore, setPlayerStore } from '@lib/stores/player.ts';


export default function(
  audio: HTMLAudioElement,
  prefetch = ''
) {
  audio.pause();
  const message = 'Error 403 : Unauthenticated Stream';
  const { stream } = playerStore;
  const id = prefetch || stream.id;
  const { index, invidious } = store;
  const origin = new URL(audio.src).origin;

  if (audio.src.endsWith('&fallback')) {
    if (!playerStore.isWatching) {
      setStore('snackbar', message);
      setPlayerStore('playbackState', 'none');
    }
    return;
  }
  console.log('ErrorHandler: ' + audio.src);

  if (index < invidious.length) {
    const proxy = invidious[index];
    if (!prefetch)
      setPlayerStore('status', `Switching proxy to ${proxy.slice(8)}`);
    if (audio.src.includes(proxy))
      audio.src = audio.src.replace(proxy, origin);
    else
      audio.src = audio.src.replace(origin, proxy);
    setStore('index', index + 1)
  }
  else {
    setStore('index', 0);
    if (!prefetch) {
      setPlayerStore('status', 'Finding new source...');
    }
    import('../utils/player').then(mod => mod.player(id, true));
  }
}
