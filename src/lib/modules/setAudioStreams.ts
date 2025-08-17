import { audio, playButton, qualityView, title } from "../lib/dom";

import { handleXtags, preferredStream, proxyHandler } from "../lib/utils";
import { i18n } from "../scripts/i18n";

export default async function(audioStreams: AudioStream[],
  isLive = false,
  receiver: HTMLAudioElement = audio
) {
  const prefetch = !receiver.parentNode;
  if (!prefetch)
    title.textContent = i18n('player_audiostreams_setup');

  const noOfBitrates = audioStreams.length;

  if (!noOfBitrates) {
    title.textContent = i18n(
      isLive ?
        'player_livestreams_hls' :
        'player_audiostreams_null'
    );
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }


  const stream = await preferredStream(handleXtags(audioStreams));
  qualityView.textContent = stream.quality + ' ' + stream.codec;
  receiver.src = proxyHandler(stream.url, prefetch);

}
