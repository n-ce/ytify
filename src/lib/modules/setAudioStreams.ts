import { playerStore, setPlayerStore, t } from "@stores";
import { handleXtags, preferredStream, proxyHandler } from "@utils";

export default async function(
  audioStreams: AudioStream[],
  prefetchNode?: HTMLAudioElement
) {

  if (!prefetchNode)
    setPlayerStore('status', t('player_audiostreams_setup'));

  const noOfBitrates = audioStreams.length;

  if (!noOfBitrates) {
    setPlayerStore('status', t('player_audiostreams_null'));
    setPlayerStore('playbackState', 'none');
    return;
  }


  const stream = await preferredStream(handleXtags(audioStreams));
  //qualityView.textContent = stream.quality + ' ' + stream.codec;
  const target = prefetchNode || playerStore.audio;
  delete target.dataset.retried;
  target.src = proxyHandler(stream.url, Boolean(prefetchNode));

}
