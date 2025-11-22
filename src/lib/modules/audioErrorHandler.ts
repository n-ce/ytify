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
    setStore('index', index + 1);
    const proxy = invidious[index];

    if (!prefetch)
      setPlayerStore('status', `Switching proxy to ${proxy.slice(8)}`);
    if (audio.src.includes(proxy))
      audio.src = audio.src.replace(proxy, origin);
    else
      audio.src = audio.src.replace(origin, proxy);
  }
  else {

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
