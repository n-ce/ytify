import { title, playButton } from '../lib/dom.ts';
import { store, state } from '../lib/store.ts';
import { getDownloadLink, notify } from '../lib/utils.ts';

export default function(audio: HTMLAudioElement) {
  audio.pause();
  const message = 'Error 403 : Unauthenticated Stream';
  const id = store.stream.id;
  const { fallback } = store.player;
  const { index, invidious } = store.api;
  const { HLS, customInstance } = state;

  if (HLS || customInstance)
    return notify(message);

  const origin = new URL(audio.src).origin;

  if (audio.src.endsWith('&fallback')) {
    if (audio.parentNode) {
      notify(message);
      playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    }
    return;
  }

  if (index < invidious.length) {
    const proxy = invidious[index];
    if (audio.parentNode)
      title.textContent = `Switching proxy to ${proxy.slice(8)}`;
    audio.src = audio.src.replace(origin, proxy);
    store.api.index++;
  }
  else {
    store.api.index = 0;
    if (audio.parentNode) {
      notify(message);
      title.textContent = store.stream.title;
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
            playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
        })
    }

  }
}
