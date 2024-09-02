import { audio, listAnchor, actionsMenu } from "./dom";
import { fetchCollection, removeFromCollection } from "./libraryUtils";
import { generateImageUrl, getThumbIdFromLink } from "./imageUtils";
import player from "./player";
import { getSaved, store } from "./store";
import { render } from 'solid-js/web';
import ListItem from "../components/ListItem";
import StreamItem from "../components/StreamItem";
import fetchList from "../modules/fetchList";



export const $ = document.createElement.bind(document);

export const save = localStorage.setItem.bind(localStorage);

export const removeSaved = localStorage.removeItem.bind(localStorage);

export const goTo = (route: string) => (<HTMLAnchorElement>document.getElementById(route)).click();

export const getApi = (
  type: 'piped' | 'invidious' | 'hyperpipe',
  index: number = store.api.index) =>
  store.api.list[index][type];

export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];


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


export async function errorHandler(message: string,
  redoAction: () => void,
  finalAction: () => void,
  instanceType: 'piped' | 'invidious' | 'hyperpipe'
) {

  // Get Current API
  // if condition
  //     > Display Error
  //     > Redo Action with Next API
  // final action if all fails

  const instanceSelector = document.getElementById('instanceSelector') as HTMLSelectElement | null;
  const apiIndex = instanceSelector?.selectedIndex || 0;
  const apiUrl = getApi(instanceType, apiIndex);
  const noOfInstances = instanceSelector?.length || 1;

  if (message === 'nextpage error') return;

  if (
    message !== 'No Data Found' &&
    apiIndex < noOfInstances - 1
  ) {
    const nextApi = getApi(instanceType, apiIndex + 1);

    notify(`switched instance from ${apiUrl} to ${nextApi} due to ${message}.`);

    if (instanceSelector)
      instanceSelector.selectedIndex++;

    store.api.index = instanceSelector?.selectedIndex || 0;

    redoAction();
    return;
  }
  notify(message);
  finalAction();
  if (instanceSelector)
    instanceSelector.selectedIndex = store.api.index = 0;
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


