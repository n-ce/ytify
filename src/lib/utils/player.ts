import { convertSStoHHMMSS } from "./helpers";
import { setMetaData } from "../modules/setMetadata";
import getStreamData from "../modules/getStreamData";
import { params, playerStore, setPlayerStore, setStore, store } from "../stores";
import { config } from "./config";

export async function player(id: string | null = '') {

  if (!id) return;

  if (config.watchMode) {
    setStore('features', 'video', true);
    return;
  }

  setPlayerStore('playbackState', 'loading');


  if (useSaavn) {
    if (config.jiosaavn && store.stream.author.endsWith('Topic'))
      return saavnPlayer();
  }
  else useSaavn = true;

  setPlayerStore('title', 'Fetching Data...');

  const data = await getStreamData(id);

  if (data && 'audioStreams' in data)
    playerStore.data = data;
  else {

    setPlayerStore('playbackState', 'none');
    setPlayerStore('title', data.message || data.error || 'Fetching Data Failed')
    return;
  }

  await setMetaData({
    id: id,
    title: data.title,
    author: data.uploader,
    duration: convertSStoHHMMSS(data.duration),
    channelUrl: data.uploaderUrl
  });

  if (playerStore.legacy) {
    playerStore.audio.src = data.hls;
    playerStore.audio.load();
  }
  else {
    const { hls } = playerStore;
    if (config.HLS) {
      const hlsUrl = hls.manifests.shift();
      if (hlsUrl) hls.src(hlsUrl);
    }
    else import('../modules/setAudioStreams')
      .then(mod => mod.default(
        data.audioStreams
          .sort((a: { bitrate: string }, b: { bitrate: string }) => (parseInt(a.bitrate) - parseInt(b.bitrate))
          ),
        data.livestream
      ));
  }


  params.set('s', id);

  if (location.pathname === '/')
    history.replaceState({}, '', location.origin + '?s=' + params.get('s'));



  if (config.enqueueRelatedStreams)
    import('../modules/enqueueRelatedStreams')
      .then(mod => mod.default(data.relatedStreams as StreamItem[]));



  // related streams imported into discovery after 1min 40seconds, short streams are naturally filtered out

  if (config.discover)
    import('../modules/setDiscoveries')
      .then(mod => {
        setTimeout(() => {
          mod.default(id, data.relatedStreams as StreamItem[]);
        }, 1e5);
      });

}


let useSaavn = true;
function saavnPlayer() {
  setPlayerStore('title', 'Fetching Data via JioSaavn...');
  const { title, author, id } = store.stream;
  const query = encodeURIComponent(`${title} ${author.slice(0, -8)}`);

  fetch(`${store.api.jiosaavn}/api/search/songs?query=${query}`)
    .then(res => res.json())
    .then(_ => _.data.results[0])
    .then(data => {
      const { name, downloadUrl, artists } = data;

      if (
        title.startsWith(name) &&
        author.startsWith(artists.primary[0].name)
      )
        playerStore.data = data;

      else throw new Error('Music stream not found');

      setMetaData(store.stream);

      const { url } = downloadUrl[{
        low: 1,
        medium: downloadUrl.length - 2,
        high: downloadUrl.length - 1
      }[config.quality]];

      playerStore.audio.src = url.replace('http:', 'https:');

      params.set('s', id);

      if (location.pathname === '/')
        history.replaceState({}, '', location.origin + '?s=' + params.get('s'));
    })
    .catch(e => {
      setPlayerStore('title', e.message || e.error || 'JioSaavn Playback Failure');
      useSaavn = false;
      player(store.stream.id);
    });
}
