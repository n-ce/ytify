import { store } from "../lib/store";
import { notify } from "../lib/utils";
import { audio, playButton, title } from '../lib/dom';
import player from '../lib/player';
import Hls from "hls.js";

export default function(mod: typeof Hls) {
  store.player.HLS = new mod();
  const h = store.player.HLS as Hls;
  h.attachMedia(audio);
  h.on(mod.Events.MANIFEST_PARSED, () => {
    h.currentLevel = store.player.hq ?
      h.levels.findIndex(l => l.audioCodec === 'mp4a.40.2') : 0;
    audio.play();
  });
  h.on(mod.Events.ERROR, (_, d) => {


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
      store.api.piped.splice(store.api.index, 1);
      if (store.api.piped.length)
        player(store.stream.id)
      else {
        playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
        title.textContent = 'All Instances Failed, Reload the page to retry.';

      }

    }

  });

}
