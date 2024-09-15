import { audio, favButton, favIcon, playButton } from "./dom";
import { convertSStoHHMMSS } from "./utils";
import { params, store, getSaved } from "./store";
import { setMetaData } from "../modules/setMetadata";
import { getDB } from "./libraryUtils";
import { getData } from "../modules/getStreamData";

export default async function player(id: string | null = '') {

  if (!id) return;

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');

  const data = store.player.prefetch[id] || await getData(id) as Piped;


  if (!data || !('audioStreams' in data)) {
    await player(id);
    return;
  }
  else store.player.prefetch[id] = data;

  await setMetaData({
    id: id,
    title: data.title,
    author: data.uploader,
    duration: convertSStoHHMMSS(data.duration),
    channelUrl: data.uploaderUrl
  });

  if (store.player.legacy) {
    alert('playing in legacy mode!')
    audio.src = data.hls;
    audio.play();
  }
  else {
    alert('playing in modern mode!')
    const h = store.player.HLS;
    h ?
      h.loadSource(data.hls) :
      import('../modules/setAudioStreams').then(mod => mod.setAudioStreams(
        data.audioStreams
          .sort((a: { bitrate: string }, b: { bitrate: string }) => (parseInt(a.bitrate) - parseInt(b.bitrate))
          ),
        data.category === 'Music',
        data.livestream
      ));
  }

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
