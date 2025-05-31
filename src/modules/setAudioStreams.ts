import { audio, bitrateSelector, playButton, title } from "../lib/dom";
import { state, store } from "../lib/store";
import { handleXtags, proxyHandler } from "../lib/utils";
import { i18n } from "../scripts/i18n";

export default async function(audioStreams: AudioStream[],
  isLive = false,
  receiver: HTMLAudioElement = audio
) {
  const prefetch = !receiver.parentNode;
  if (!prefetch)
    title.textContent = i18n('player_audiostreams_setup');

  const preferedCodec = state.codec === 'any' ? ((await store.player.supportsOpus) ? 'opus' : 'aac') : state.codec;
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
      const hqPref = state.hq ? noOfBitrates : 0;
      if (codecPref && index < hqPref) index = i;
    });

  bitrateSelector.selectedIndex = index;

  receiver.src = proxyHandler(bitrateSelector.value, prefetch);
}
