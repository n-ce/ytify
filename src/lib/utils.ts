import { audio, img, listAnchor, subtitleContainer, subtitleTrack, actionsMenu, title, instanceSelector, subtitleSelector, author } from "./dom";
import { fetchCollection, removeFromCollection } from "./libraryUtils";
import { generateImageUrl, getThumbIdFromLink, sqrThumb } from "./imageUtils";
import { render } from 'solid-js/web';
import ListItem from "../components/ListItem";
import StreamItem from "../components/StreamItem";
import player from "./player";
import { getSaved, store } from "../store";
import fetchList from "../scripts/fetchList";



export const $ = document.createElement.bind(document);

export const save = localStorage.setItem.bind(localStorage);

export const removeSaved = localStorage.removeItem.bind(localStorage);

export const goTo = (route: string) => (<HTMLAnchorElement>document.getElementById(route)).click();

export const getApi = (
  type: 'piped' | 'invidious' | 'hyperpipe',
  index: number = instanceSelector.selectedIndex || 0) =>
  store.api[index][type];

export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];

export const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

export const getPlaylistIdFromArtist = (id: string): Promise<string> =>
  fetch(getApi('hyperpipe') + id)
    .then(res => res.json())
    .then(data => {
      if (!('playlistId' in data))
        throw new Error('No Playlist Id found.');
      store.list.id = data.playlistId;
      store.list.name = 'Artist - ' + data.title;
      store.list.thumbnail = data.thumbnails[0].url;
      return '/playlists/' + data.playlistId;
    })
    .catch(_ => {
      notify(_);
      return '';
    })

export const hostResolver = (url: string) =>
  store.linkHost + (store.linkHost.includes('ytify') ? url.
    startsWith('/watch') ?
    ('?s' + url.slice(8)) :
    ('/list?' + url.slice(1).split('/').join('=')) : url);

export async function quickSwitch() {
  if (!store.stream.id) return;
  if (store.player.playbackState === 'playing')
    audio.pause();
  const timeOfSwitch = audio.currentTime;
  await player(store.stream.id);
  audio.currentTime = timeOfSwitch;
  audio.play();
}

export function notify(text: string) {
  if (getSaved('toasts')) return;
  const el = $('p');
  const clear = () => document.getElementsByClassName('snackbar')[0] && el.remove();
  el.className = 'snackbar';
  el.textContent = text;
  el.onclick = clear;
  setTimeout(clear, 8e3);
  document.body.appendChild(el);
}


export function convertSStoHHMMSS(seconds: number): string {
  if (seconds < 0) return '';
  const hh = Math.floor(seconds / 3600);
  seconds %= 3600;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  let mmStr = String(mm);
  let ssStr = String(ss);
  if (mm < 10) mmStr = '0' + mmStr;
  if (ss < 10) ssStr = '0' + ssStr;
  return (hh > 0 ?
    hh + ':' : '') + `${mmStr}:${ssStr}`;
}


let more = () => undefined;

document.getElementById('moreBtn')!.addEventListener('click', () => more());


export async function setMetaData(
  stream: CollectionItem
) {

  // remove ' - Topic' from author name if it exists

  let music = false;
  let authorText = stream.author;
  if (stream.author.endsWith(' - Topic')) {
    music = true;
    authorText = stream.author.slice(0, -8);
  }

  const metadataObj: MediaMetadataInit = {
    title: stream.title,
    artist: authorText,
  };

  const imgx = generateImageUrl(stream.id, 'maxres');
  if (store.loadImage !== 'off') {
    img.src = music ? await sqrThumb(imgx) : imgx;
    metadataObj.artwork = [
      { src: img.src, sizes: '96x96' },
      { src: img.src, sizes: '128x128' },
      { src: img.src, sizes: '192x192' },
      { src: img.src, sizes: '256x256' },
      { src: img.src, sizes: '384x384' },
      { src: img.src, sizes: '512x512' },
    ]
    img.alt = stream.title;
  }


  title.href = hostResolver(`/watch?v=${stream.id}`);
  title.textContent = stream.title;

  author.textContent = authorText;

  more = function() {
    store.actionsMenu = stream;
    actionsMenu.showModal();
    history.pushState({}, '', '#');
  }


  if (location.pathname === '/')
    document.title = stream.title + ' - ytify';


  if ('mediaSession' in navigator) {
    navigator.mediaSession.setPositionState();
    navigator.mediaSession.metadata = new MediaMetadata(metadataObj);
  }

}


export function itemsLoader(itemsArray: StreamItem[]) {
  if (!itemsArray.length)
    throw new Error('No Data Found');

  const streamItem = (stream: StreamItem) => StreamItem({
    id: stream.videoId || stream.url.substring(9),
    href: hostResolver(stream.url || ('/watch?v=' + stream.videoId)),
    title: stream.title,
    author: (stream.uploaderName || stream.author) + (location.search.endsWith('music_songs') ? ' - Topic' : ''),
    duration: (stream.duration || stream.lengthSeconds) > 0 ? convertSStoHHMMSS(stream.duration || stream.lengthSeconds) : 'LIVE',
    uploaded: stream.uploadedDate || stream.publishedText,
    channelUrl: stream.uploaderUrl || stream.authorUrl,
    views: stream.viewCountText || (stream.views > 0 ? numFormatter(stream.views) + ' views' : ''),
    img: getThumbIdFromLink(stream.thumbnail || 'https://i.ytimg.com/vi_webp/' + stream.videoId + '/mqdefault.webp?host=i.ytimg.com')
  })

  const listItem = (item: StreamItem) => ListItem(
    item.name,
    item.subscribers > 0 ?
      (numFormatter(item.subscribers) + ' subscribers') :
      (item.videos > 0 ? item.videos + ' streams' : ''),
    generateImageUrl(
      getThumbIdFromLink(
        item.thumbnail
      )
    ),
    item.description || item.uploaderName,
    item.url
  )

  const fragment = document.createDocumentFragment();
  for (const item of itemsArray)
    render(() => (item.type === 'stream' || item.type === 'video') ? streamItem(item) : listItem(item), fragment);


  return fragment;
}


// TLDR : Stream Item Click Action
export function superClick(e: Event) {
  const elem = e.target as HTMLAnchorElement;
  if (elem.target === '_blank') return;
  e.preventDefault();

  const eld = elem.dataset;
  const elc = elem.classList.contains.bind(elem.classList);

  if (elc('streamItem'))
    return elc('delete') ?
      removeFromCollection(listAnchor.dataset.id as string, eld.id as string)
      : player(eld.id);

  else if (elc('ri-more-2-fill')) {
    actionsMenu.showModal();
    history.pushState({}, '', '#');
    const elp = elem.parentElement!.dataset;
    const sta = store.actionsMenu;
    sta.id = elp.id as string;
    sta.title = elp.title as string;
    sta.author = elp.author as string;
    sta.channelUrl = elp.channel_url as string;
    sta.duration = elp.duration as string;

  }

  else if (elc('ur_pls_item'))
    fetchCollection(elem.textContent as string);

  else if (elc('listItem')) {

    // to prevent conflicts
    store.actionsMenu.author = '';

    let url = eld.url as string;

    if (!url.startsWith('/channel'))
      url = url.replace('?list=', 's/');

    fetchList(url);
    store.list.name = eld.title as string;

    store.list.thumbnail = eld.thumbnail?.startsWith('https://') ? eld.thumbnail : url + eld.thumbnail;
    console.log(store.list)
  }
}


export async function parseTTML() {

  const imsc = await import('imsc/dist/imsc.all.min.js');
  const myTrack = audio.textTracks[0];
  myTrack.mode = "hidden";
  const d = img.getBoundingClientRect();


  subtitleContainer.style.top = Math.floor(d.y) + 'px';
  subtitleContainer.style.left = Math.floor(d.x) + 'px';
  subtitleSelector.parentElement!.style.position = 'static';
  subtitleSelector.style.top = Math.floor(d.y) + 'px';
  subtitleSelector.style.left = Math.floor(d.x) + 'px';


  fetch(subtitleTrack.src)
    .then(res => res.text())
    .then(text => {

      const imscDoc = imsc.fromXML(text);
      const timeEvents = imscDoc.getMediaTimeEvents();
      const telen = timeEvents.length;

      for (let i = 0; i < telen; i++) {
        const myCue = new VTTCue(timeEvents[i], (i < telen - 1) ? timeEvents[i + 1] : audio.duration, '');

        myCue.onenter = () => {
          const subtitleActive = subtitleContainer.firstChild;
          if (subtitleActive)
            subtitleContainer.removeChild(subtitleActive);
          imsc.renderHTML(
            imsc.generateISD(imscDoc, myCue.startTime),
            subtitleContainer,
            img,
            Math.floor(d.height),
            Math.floor(d.width)
          );
        }
        myCue.onexit = () => {
          const subtitleActive = subtitleContainer.firstChild;
          if (subtitleActive)
            subtitleContainer.removeChild(subtitleActive)
        }
        myTrack.addCue(myCue);
      }
    });
}
