import { playerStore, setPlayerStore, t } from "../stores";
import { handleXtags, preferredStream, proxyHandler } from "../utils";

export default async function(audioStreams: AudioStream[],
  isLive = false,
  receiver: HTMLAudioElement = playerStore.audio
) {
  const prefetch = !receiver.parentNode;
  if (!prefetch)
    setPlayerStore('title', t('player_audiostreams_setup'));

  const noOfBitrates = audioStreams.length;

  if (!noOfBitrates) {
    setPlayerStore('title', t(
      isLive ?
        'player_livestreams_hls' :
        'player_audiostreams_null'
    ));
    setPlayerStore('playbackState', 'none');
    return;
  }


  const stream = await preferredStream(handleXtags(audioStreams));
  //qualityView.textContent = stream.quality + ' ' + stream.codec;
  receiver.src = proxyHandler(stream.url, prefetch);

}
