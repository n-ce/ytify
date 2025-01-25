import { audio, bitrateSelector, playButton, title } from "../lib/dom";
import { store } from "../lib/store";
import { notify, proxyHandler } from "../lib/utils";
import {i18n} from "../scripts/i18n.ts";

export function setAudioStreams(audioStreams: {
  codec: string,
  url: string,
  quality: string,
  bitrate: string,
  contentLength: number,
  mimeType: string
}[],
  isLive = false) {

  title.textContent = i18n._('as_setting_up');

  const preferedCodec = store.player.codec;
  const noOfBitrates = audioStreams.length;
  let index = -1;

  if (!noOfBitrates) {
    notify(
      isLive ?
          i18n._('as_turn_hls') :
          i18n._('as_no_found')
    );
    i18n._('as_turn_hls')
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }


  bitrateSelector.innerHTML = '';
  audioStreams.forEach(async (_, i: number) => {
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
