import { favButton, favIcon, playButton } from "./dom";
import { convertSStoHHMMSS, notify } from "./utils";
import { params, store, getSaved } from "./store";
import { setMetaData } from "../modules/setMetadata";
import { getDB } from "./libraryUtils";

export default async function player(id: string | null = '') {

  if (!id) return;

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');

  const f = (i: string) => fetch(i + '/streams/' + id)
    .then(res => res.json())
    .then(async data => {
      if ('audioStreams' in data)
        return data;
      else throw new Error(data.message);
    })
    .catch(() => '')


  store.player.dataArray = (await Promise
    .all(store.api.list.map(f)))
    .filter(i => i);


  if (!store.player.dataArray.length) {
    notify('No Piped Instances could return data, Retrying...');
    await player(id);
    return;
  }

  const data = store.player.dataArray[0];

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
    import('../modules/setAudioStreams').then(mod => mod.setAudioStreams(
      data.audioStreams
        .sort((a: { bitrate: string }, b: { bitrate: string }) => (parseInt(a.bitrate) - parseInt(b.bitrate))
        ),
      data.category === 'Music',
      data.livestream
    ));


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
