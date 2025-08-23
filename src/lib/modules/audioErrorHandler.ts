import { openDialog } from '../stores/dialog.ts';
import { playerStore, setPlayerStore } from '../stores/player.ts';
import { setStore, store } from '../stores/app.ts';
import { config } from '../utils/config.ts';
import { getDownloadLink } from '../utils/helpers.ts';

export default function(audio: HTMLAudioElement) {
  audio.pause();
  const message = 'Error 403 : Unauthenticated Stream';
  const id = store.stream.id;
  const { fallback } = playerStore;
  const { index, invidious } = store.api;
  const { enforcePiped, HLS, customInstance } = config;

  if (enforcePiped || HLS || customInstance)
    return openDialog('snackbar', message);

  const origin = new URL(audio.src).origin;

  if (audio.src.endsWith('&fallback')) {
    if (audio.parentNode) {
      openDialog('snackbar', message);
      setPlayerStore('playbackState', 'none');
    }
    return;
  }

  if (index.invidious < invidious.length) {
    const proxy = invidious[index.invidious];
    if (audio.parentNode)
      setPlayerStore('title', `Switching proxy to ${proxy.slice(8)}`);
    audio.src = audio.src.replace(origin, proxy);
    setStore('api', 'index', 'invidious', index.invidious + 1)
  }
  else {
    setStore('api', 'index', 'invidious', 0)
    if (audio.parentNode) {
      openDialog('snackbar', message);
      setPlayerStore('title', store.stream.title);
    }

    // Emergency Handling
    if (!fallback) useCobalt();
    else
      fetch(fallback + '/streams/' + id)
        .then(res => res.json())
        .then(data => {
          import('./setAudioStreams.ts')
            .then(mod => mod.default(data.audioStreams, data.livestream, audio));
        })
        .catch(useCobalt);

    function useCobalt() {
      getDownloadLink(id)
        .then(_ => {
          if (_)
            audio.src = _;
          else throw new Error();
        })
        .catch(() => {
          if (audio.parentNode)
            setPlayerStore('playbackState', 'none');
        })
    }

  }
}
