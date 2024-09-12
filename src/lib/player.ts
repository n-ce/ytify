import { favButton, favIcon, playButton } from "./dom";
import { convertSStoHHMMSS } from "./utils";
import { params, store, getSaved } from "./store";
import { setMetaData } from "../modules/setMetadata";
import { getDB } from "./libraryUtils";
import { getData } from "../modules/getStreamData";

function setAudioStreams(data: Piped) {
  import('../modules/setAudioStreams').then(mod => mod.setAudioStreams(
    data.audioStreams
      .sort((a: { bitrate: string }, b: { bitrate: string }) => (parseInt(a.bitrate) - parseInt(b.bitrate))
      ),
    data.category === 'Music',
    data.livestream
  ));
}

export default async function player(id: string | null = '') {

  if (!id) return;

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');


  const data = await getData(id) as Piped;

  if (!data || !('audioStreams' in data)) {
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }



  await setMetaData({
    id: id,
    title: data.title,
    author: data.uploader,
    duration: convertSStoHHMMSS(data.duration),
    channelUrl: data.uploaderUrl
  });

  const h = store.player.HLS;
  h ?
    h.loadSource(data.hls) :
    setAudioStreams(data);


  if (data.subtitles.length)
    import('../modules/setSubtitles')
      .then(mod => mod.setSubtitles(data.subtitles));


  params.set('s', id);

  if (location.pathname === '/')
    history.replaceState({}, '', location.origin + '?s=' + params.get('s'));



  if (getSaved('enqueueRelatedStreams') === 'on')
    import('../modules/enqueueRelatedStreams')
      .then(mod => mod.enqueueRelatedStreams(data.relatedStreams as StreamItem[]));


  // favbutton reset
  if (favButton.checked) {
    favButton.checked = false;
    favIcon.classList.remove('ri-heart-fill');
  }

  // favbutton set
  if (getDB().favorites?.hasOwnProperty(id)) {
    favButton.checked = true;
    favIcon.classList.add('ri-heart-fill');
  }



  // related streams imported into discovery after 1min 40seconds, short streams are naturally filtered out

  if (getSaved('discover') !== 'off')
    import('../modules/setDiscoveries')
      .then(mod => {
        setTimeout(() => {
          mod.setDiscoveries(id, data.relatedStreams as StreamItem[]);
        }, 1e5);
      });

}
