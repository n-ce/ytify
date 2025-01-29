import { store } from "../lib/store";
import { notify } from "../lib/utils";
import { audio, playButton } from '../lib/dom';
import Hls from "hls.js";

export default function() {
  const h = new Hls();

  h.attachMedia(audio);
  store.player.hls.src = h.loadSource.bind(h);
  h.on(Hls.Events.MANIFEST_PARSED, () => {
    h.currentLevel = store.player.hq ?
      h.levels.findIndex(l => l.audioCodec === 'mp4a.40.2') : 0;
    audio.play();
  });

  h.on(Hls.Events.ERROR, (_, d) => {


    if (d.details === 'manifestLoadError') {
      const hlsUrl = store.player.data!.hls;
      const piProxy = (new URL(hlsUrl)).origin;

      if (piProxy === store.api.invidious[0]) {
        notify(d.details);
        return;
      }
      const newUrl = hlsUrl.replace(piProxy, store.api.invidious[0]);
      h.loadSource(newUrl);

    }
    else {
      if (d.details === 'levelLoadError')
        return;
      const hlsUrl = store.player.hls.manifests.shift();
      if (hlsUrl) {
        h.stopLoad();
        h.loadSource(hlsUrl);
      }
      else {
        playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
        notify(d.details);
      }
    }

  });

}
