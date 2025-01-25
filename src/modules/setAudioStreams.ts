import { i18n } from "@lingui/core";
import { audio, bitrateSelector, playButton, title } from "../lib/dom";
import { store, getSaved } from "../lib/store";
import { proxyHandler } from "../lib/utils";

export function setAudioStreams(audioStreams: {
  codec: string,
  url: string,
  quality: string,
  bitrate: string,
  contentLength: number,
  mimeType: string
}[],
  isLive = false) {

  title.textContent = i18n._('player_setup_audiostreams');

  const preferedCodec = store.player.codec;
  const noOfBitrates = audioStreams.length;
  let index = -1;

  if (!noOfBitrates) {
    title.textContent = i18n._(
      isLive ?
        'player_livestreams_hls' :
        'player_audiostreams_null'
    );
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }

  bitrateSelector.innerHTML = '';

  const isDRC = (url: string) => url.includes('xtags=drc%3D1');
  const useDRC = getSaved('stableVolume') && Boolean(audioStreams.find(a => isDRC(a.url)));

  audioStreams
    .filter(a => useDRC ? isDRC(a.url) : !isDRC(a.url))
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
