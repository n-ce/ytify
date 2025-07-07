import { audio, favButton, favIcon, playButton, qualityView, title } from "./dom";
import { convertSStoHHMMSS } from "./utils";
import { params, state, store } from "./store";
import { setMetaData } from "../modules/setMetadata";
import { getDB } from "./libraryUtils";
import getStreamData from "../modules/getStreamData";

let trigger = true;

export default async function player(id: string | null = '') {

  if (!id) return;

  const useSaavn = state.jiosaavn && store.stream.author.endsWith('Topic');

  if (useSaavn && trigger)
    return saavnPlayer();
  trigger = true;


  if (state.watchMode) {
    store.actionsMenu.id = id;
    const dialog = document.createElement('dialog');
    dialog.open = true;
    dialog.className = 'watcher';
    document.body.appendChild(dialog);
    import('../components/WatchVideo')
      .then(mod => mod.default(dialog));
    return;
  }

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');
  title.textContent = 'Fetching Data...';


  const data = await getStreamData(id);

  if (data && 'audioStreams' in data)
    store.player.data = data;
  else {
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    title.textContent = data.message || data.error || 'Fetching Data Failed';
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

  if (state.discover)
    import('../modules/setDiscoveries')
      .then(mod => {
        setTimeout(() => {
          mod.default(id, data.relatedStreams as StreamItem[]);
        }, 1e5);
      });

}
function saavnPlayer() {
  const query = encodeURIComponent(`${store.stream.title} ${store.stream.channelUrl.slice(0, -8)}`);
  const api = 'https://saavn-sigma.vercel.app/api';
  title.textContent = 'Fetching Data via JioSaavn...';

  fetch(`${api}/search/songs?query=${query}`)
    .then(res => res.json())
    .then(_ => {
      const { name, downloadUrl, artists } = _.data.results[0];
      if (name !== store.stream.title &&
        !store.stream.author.startsWith(artists.primary[0].name)
      )
        throw new Error('Track not found');
      else {
        store.player.data = _.data.results[0];
        return downloadUrl;
      }
    })
    .then(dl => {
      setMetaData({
        id: store.stream.id,
        title: store.stream.title,
        author: store.stream.author,
        duration: store.stream.duration,
        channelUrl: store.stream.channelUrl
      });
      const q = {
        low: 1,
        medium: 2,
        high: dl.length - 1
      }[state.quality];

      audio.src = dl[q].url.replace('http', 'https');
      qualityView.textContent = dl[q].quality + ' AAC';
    })
    .catch(_ => {
      title.textContent = _.message;
      trigger = false;
      player(store.stream.id);
    });
}
