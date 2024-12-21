import { audio, actionsMenu, title } from "./dom";
import { generateImageUrl, getThumbIdFromLink } from "./imageUtils";
import player from "./player";
import { getSaved, store } from "./store";
import { render } from 'solid-js/web';
import ListItem from "../components/ListItem";
import StreamItem from "../components/StreamItem";
import fetchList from "../modules/fetchList";
import { fetchCollection, removeFromCollection } from "./libraryUtils";


export const $ = document.createElement.bind(document);

export const save = localStorage.setItem.bind(localStorage);

export const removeSaved = localStorage.removeItem.bind(localStorage);

export const goTo = (route: string) => (<HTMLAnchorElement>document.getElementById(route)).click();

export const getApi = (
  type: 'piped' | 'invidious',
  index: number = store.api.index
) =>
  store.api[type][index];

export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];


const pathModifier = (url: string) => url.includes('=') ?
  'playlists=' + url.split('=')[1] :
  url.slice(1).split('/').join('=');

export const hostResolver = (url: string) =>
  store.linkHost + (store.linkHost.includes(location.origin) ? (url.
    startsWith('/watch') ?
    ('?s' + url.slice(8)) :
    ('/list?' + pathModifier(url))) : url);

export async function proxyHandler(url: string) {
  const link = new URL(url);

  store.api.index = 0;
  title.textContent = 'Injecting optimal audio source into player';

  return url.includes('host=') ?
    url.replace(link.origin,
      getSaved('enforceProxy') ?
        store.api.invidious[0] :
        'https://' + link.searchParams.get('host')
    ) :
    url + '&host=' + link.origin.slice(8);
}

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
  if (seconds === Infinity) return 'Emergency Mode';
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

export async function getDownloadLink(id: string): Promise<string | null> {
  const streamUrl = 'https://youtu.be/' + id;
  const dl = await fetch(store.api.cobalt, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: streamUrl,
      downloadMode: 'audio',
      audioFormat: store.downloadFormat,
      filenameStyle: 'basic'
    })
  })
    .then(_ => _.json())
    .then(_ => {
      if ('url' in _)
        return _.url;
      else throw new Error(_.error.code);
    })
    .catch(notify);

  return dl || '';
}

export async function errorHandler(
  message: string = '',
  redoAction: () => void,
  finalAction: () => void
) {

  if (message === 'nextpage error') return;

  if (
    message !== 'No Data Found' &&
    store.api.index < store.api.piped.length - 1
  ) {
    store.api.index++;
    return redoAction();
  }
  notify(message);
  finalAction();
  store.api.index = 0;
}




export function itemsLoader(itemsArray: StreamItem[] | null) {
  if (!itemsArray?.length)
    throw new Error('No Data Found');

  const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);


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
      ), ''
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
export async function superClick(e: Event) {
  const elem = e.target as HTMLAnchorElement & { dataset: CollectionItem };
  if (elem.target === '_blank') return;
  e.preventDefault();

  const eld = elem.dataset;
  const elc = elem.classList.contains.bind(elem.classList);

  if (elc('streamItem'))
    return elc('delete') ?
      removeFromCollection(store.list.id, eld.id as string)
      : player(eld.id);

  else if (elc('ur_cls_item'))
    fetchCollection(elem.textContent as string);

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


  else if (elc('listItem')) {

    // to prevent conflicts
    store.actionsMenu.author = '';

    let url = eld.url as string;

    if (!url.startsWith('/channel'))
      url = url.replace('?list=', 's/');

    store.list.name = (
      (location.search.endsWith('music_artists') ||
        (location.pathname === '/library' && getSaved('defaultSuperCollection') === 'artists')
      )
        ? 'Artist - ' : ''
    ) + eld.title;
    store.list.uploader = eld.uploader!;

    store.list.thumbnail = eld.thumbnail ? getThumbIdFromLink(eld.thumbnail) : '';

    fetchList(url);
  }
}


