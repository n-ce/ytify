import { title, audio, playButton } from '../lib/dom.ts';
import { store } from '../lib/store.ts';
import { getDownloadLink, notify } from '../lib/utils.ts';

export default function() {
  audio.pause();
  const message = 'Error 403 : Unauthenticated Stream';
  const id = store.stream.id;
  const { usePiped, fallback, hls } = store.player;
  const { index, invidious } = store.api;

  if (usePiped || hls.on)
    return notify(message);

  const origin = new URL(audio.src).origin;

  if (index < invidious.length) {
    const proxy = invidious[index];
    title.textContent = `Switching proxy to ${proxy.slice(8)}`;
    audio.src = audio.src.replace(origin, proxy);
    store.api.index++;
  }
  else {
    store.api.index = 0;
    notify(message);
    title.textContent = store.stream.title;

    // Emergency Handling
    if (!fallback) useCobalt();
    else
      fetch(+ '/streams/' + id)
        .then(res => res.json())
        .then(data => {
          import('../modules/setAudioStreams.ts')
            .then(mod => mod.default(data.audioStreams));
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
          playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
        })
    }

  }
}
