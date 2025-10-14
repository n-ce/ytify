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
    if (audio.parentNode) {
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
    audio.src = audio.src.replace(origin, proxy);
    setStore('index', index + 1)
  }
  else {
    setStore('index', 0);

    if (!prefetch) {
      setStore('snackbar', message);
      setPlayerStore('status', '');
    }

    // Emergency Handling
    fetch('/streams/' + id)
      .then(res => res.json())
      .then(data => {
        import('./setAudioStreams.ts')
          .then(mod => mod.default(data.audioStreams, audio));
      })
      .catch(() => {
        if (!prefetch)
          setPlayerStore('playbackState', 'none');
      })

  }
}
