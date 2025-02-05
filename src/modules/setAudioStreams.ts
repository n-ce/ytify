import { audio, bitrateSelector, playButton, title } from "../lib/dom";
import { store } from "../lib/store";
import { handleXtags, i18n, proxyHandler } from "../lib/utils";

export default function(audioStreams: AudioStream[],
  isLive = false) {

  title.textContent = i18n('player_audiostreams_setup');

  const preferedCodec = store.player.codec;
  const noOfBitrates = audioStreams.length;
  let index = -1;

  if (!noOfBitrates) {
    title.textContent = i18n(
      isLive ?
        'player_livestreams_hls' :
        'player_audiostreams_null'
    );
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }

  bitrateSelector.innerHTML = '';

  handleXtags(audioStreams)
    .forEach((_, i: number) => {
      const codec = _.codec === 'opus' ? 'opus' : 'aac';
      const size = (_.contentLength / (1024 * 1024)).toFixed(2) + ' MB';

      // add to DOM
      bitrateSelector.add(new Option(`${_.quality} ${codec} - ${size}`, _.url));

      (<HTMLOptionElement>bitrateSelector?.lastElementChild).dataset.type = _.mimeType;
      // find preferred bitrate
      const codecPref = preferedCodec ? codec === preferedCodec : true;
      const hqPref = store.player.hq ? noOfBitrates : 0;
      if (codecPref && index < hqPref) index = i;
    });

  bitrateSelector.selectedIndex = index;

  audio.src = proxyHandler(bitrateSelector.value);
}
