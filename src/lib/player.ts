import { convertSStoHHMMSS } from "./utils";
import { params, setStore, state, store } from "./store";
import { setMetaData } from "../modules/setMetadata";
import getStreamData from "../modules/getStreamData";

export default async function player(id: string | null = '') {

  if (!id) return;

  if (state.watchMode) {
    store.actionsMenu.id = id;
    const dialog = document.createElement('dialog');
    dialog.open = true;
    dialog.className = 'watcher';
    document.body.appendChild(dialog);
    import('../sections/WatchVideo')
      .then(mod => mod.default(dialog));
    return;
  }

  setStore('player', 'playbackState', 'loading');

  if (useSaavn) {
    if (state.jiosaavn && store.stream.author.endsWith('Topic'))
      return saavnPlayer();
  }
  else useSaavn = true;

  setStore('player', 'title', 'Fetching Data...');

  const data = await getStreamData(id);

  if (data && 'audioStreams' in data)
    store.player.data = data;
  else {

    setStore('player', 'playbackState', 'none');
    setStore('player', 'title', data.message || data.error || 'Fetching Data Failed')
    return;
  }

  await setMetaData({
    id: id,
    title: data.title,
    author: data.uploader,
    duration: convertSStoHHMMSS(data.duration),
    channelUrl: data.uploaderUrl
  });

  if (store.player.legacy) {
    audio.src = data.hls;
    audio.load();
  }
  else {
    const { hls } = store.player;
    if (state.HLS) {
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



  if (state.enqueueRelatedStreams)
    import('../modules/enqueueRelatedStreams')
      .then(mod => mod.default(data.relatedStreams as StreamItem[]));



  // related streams imported into discovery after 1min 40seconds, short streams are naturally filtered out

  if (state.discover)
    import('../modules/setDiscoveries')
      .then(mod => {
        setTimeout(() => {
          mod.default(id, data.relatedStreams as StreamItem[]);
        }, 1e5);
      });

}


let useSaavn = true;
function saavnPlayer() {
  setStore('player', 'title', 'Fetching Data via JioSaavn...');
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
        store.player.data = data;

      else throw new Error('Music stream not found');

      setMetaData(store.stream);

      const { url, quality } = downloadUrl[{
        low: 1,
        medium: downloadUrl.length - 2,
        high: downloadUrl.length - 1
      }[state.quality]];

      audio.src = url.replace('http:', 'https:');

      // qualityView.textContent = quality + ' AAC';
      params.set('s', id);

      if (location.pathname === '/')
        history.replaceState({}, '', location.origin + '?s=' + params.get('s'));
    })
    .catch(e => {
      setStore('player', 'title', e.message || e.error || 'JioSaavn Playback Failure');
      useSaavn = false;
      player(store.stream.id);
    });
}
