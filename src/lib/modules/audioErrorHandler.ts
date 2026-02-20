import { setStore } from '@lib/stores/app.ts';
import { playerStore, setPlayerStore } from '@lib/stores/player.ts';

export default function(
  audio: HTMLAudioElement,
  prefetch = ''
) {
  audio.pause();
  const { proxy } = playerStore;
  const url = new URL(audio.src);

  if (audio.src.endsWith('&fallback')) {
    if (!playerStore.isWatching && !prefetch) {
      setStore('snackbar', 'Error 403 : Unauthenticated Stream');
      setPlayerStore('playbackState', 'none');
    }
    return;
  }

  if (!proxy || url.origin === proxy) {
    if (!prefetch) {
      setPlayerStore({
        playbackState: 'none',
        status: 'Streaming Failed'
      });
      setStore('snackbar', 'Streaming Failed');
    }
    return;
  }

  console.log('ErrorHandler: Switching to proxy ' + proxy);
  audio.src = audio.src.replace(url.origin, proxy);
}
