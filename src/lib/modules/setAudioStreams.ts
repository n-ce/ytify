import { playerStore, setPlayerStore, t } from "../stores";
import { handleXtags, preferredStream, proxyHandler } from "../utils";

export default async function(
  audioStreams: AudioStream[],
  isLive = false,
  prefetchNode: HTMLAudioElement | undefined = undefined
) {
  if (!prefetchNode)
    setPlayerStore('status', t('player_audiostreams_setup'));

  const noOfBitrates = audioStreams.length;

  if (!noOfBitrates) {
    setPlayerStore('status', t(
      isLive ?
        'player_livestreams_hls' :
        'player_audiostreams_null'
    ));
    setPlayerStore('playbackState', 'none');
    return;
  }


  const stream = await preferredStream(handleXtags(audioStreams));
  //qualityView.textContent = stream.quality + ' ' + stream.codec;
  (prefetchNode || playerStore.audio).src = proxyHandler(stream.url, Boolean(prefetchNode));

}
