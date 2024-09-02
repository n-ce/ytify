import { favButton, favIcon, playButton } from "./dom";
import { convertSStoHHMMSS, getApi, errorHandler } from "./utils";
import { getDB } from "./libraryUtils";
import { params, store, getSaved } from "./store";
import { getData } from "../modules/fetchStreamData";
import { setMetaData } from "../modules/setMetadata";
import { setAudioStreams } from "../modules/setAudioStreams";
import { setDiscoveries } from "../modules/setDiscoveries";



export default async function player(id: string | null = '') {

  if (!id) return;

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');

  const fetchViaIV = Boolean(!store.player.HLS && getSaved('fetchViaIV'));
  const apiUrl = getApi(fetchViaIV ? 'invidious' : 'piped');

  const data = await getData(id, apiUrl, fetchViaIV)
    .catch(err => {
      errorHandler(
        err.message,
        () => player(id),
        () => playButton.classList.replace(playButton.className, 'ri-stop-circle-fill'),
        fetchViaIV ? 'invidious' : 'piped'
      )
    });

  if (!data) return;

  store.stream.id = id;
  store.stream.title = data.title;
  store.stream.author = data.uploader;
  store.stream.duration = convertSStoHHMMSS(data.duration);
  store.stream.channelUrl = data.uploaderUrl;


  setMetaData(store.stream);

  const h = store.player.HLS;
  h ?
    h.loadSource(data.hls) :
    setAudioStreams(
      data.audioStreams.sort(
        (a: { bitrate: number }, b: { bitrate: number }) => (a.bitrate - b.bitrate)
      ),
      data.category === 'Music',
      data.livestream
    );

  if (data.subtitles.length)
    import('../modules/setSubtitles')
      .then(mod => mod.setSubtitles(data.subtitles));


  params.set('s', id);

  if (location.pathname === '/')
    history.replaceState({}, '', location.origin + '?s=' + params.get('s'));


  // favbutton state
  // reset
  if (favButton.checked) {
    favButton.checked = false;
    favIcon.classList.remove('ri-heart-fill');
  }

  // set
  if (getDB().favorites?.hasOwnProperty(id)) {
    favButton.checked = true;
    favIcon.classList.add('ri-heart-fill');
  }


  if (getSaved('enqueueRelatedStreams') === 'on')
    import('../modules/enqueueRelatedStreams')
      .then(mod => mod.enqueueRelatedStreams(data.relatedStreams));

  // related streams data injection as discovery data after 20 seconds

  if (getSaved('discover') !== 'off')
    setTimeout(() => setDiscoveries(id, data.relatedStreams), 2e4);

}
