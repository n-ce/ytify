import { audio, listContainer, title } from "./dom";
import { getThumbIdFromLink } from "./imageUtils";
import player from "./player";
import { state, store } from "./store";
import { html, render } from 'uhtml';
import StreamItem from "../components/StreamItem";
import fetchList from "../modules/fetchList";
import { fetchCollection, removeFromCollection } from "./libraryUtils";
import { i18n } from "../scripts/i18n.ts";


export const goTo = (route: Routes | 'history' | 'discover') => (<HTMLAnchorElement>document.getElementById(route)).click();

export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];

export const getApi = (
  type: 'piped' | 'invidious',
  index: number = store.api.index
) =>
  type === 'piped' ?
    store.api.piped.concat(store.player.hls.api)[index] :
    store.api.invidious[index];

const pathModifier = (url: string) => url.includes('=') ?
  'playlists=' + url.split('=')[1] :
  url.slice(1).split('/').join('=');

export const hostResolver = (url: string) =>
  store.linkHost + (store.linkHost.includes(location.origin) ? (url.
    startsWith('/watch') ?
    ('?s' + url.slice(8)) :
    ('/list?' + pathModifier(url))) : url);


export function proxyHandler(url: string) {
  store.api.index = 0;
  title.textContent = i18n('player_audiostreams_insert');
  const link = new URL(url);
  const origin = link.origin.slice(8);
  const host = link.searchParams.get('host');

  return state.enforceProxy ?
    (url + (host ? '' : `&host=${origin}`)) :
    (host && !state.customInstance) ? url.replace(origin, host) : url;
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
  const el = document.createElement('p');
  const clear = () => el.isConnected && el.remove();
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

export function handleXtags(audioStreams: AudioStream[]) {
  const isDRC = (url: string) => url.includes('drc%3D1');
  const useDRC = state.stableVolume && Boolean(audioStreams.find(a => isDRC(a.url)));
  const isOriginal = (a: { url: string }) => !a.url.includes('acont%3Ddubbed');

  return audioStreams
    .filter(a => useDRC ? isDRC(a.url) : !isDRC(a.url))
    .filter(isOriginal);
}

export async function getDownloadLink(id: string): Promise<string | null> {
  const streamUrl = 'https://youtu.be/' + id;
  const dl = await fetch('https://cobalt-api.kwiatekmiki.com', {
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
  store.api.index = 0;
}



export function renderCollection(
  data: (DOMStringMap | CollectionItem)[],
  draggable = false,
  fragment: DocumentFragment | undefined = undefined
) {
  render(fragment || listContainer, html`${data.map(v =>
    StreamItem({
      id: v.id || '',
      href: hostResolver(`/watch?v=${v.id}`),
      title: v.title || '',
      author: v.author,
      duration: v.duration || '',
      channelUrl: v.channelUrl,
      draggable: draggable
    })
  )
    }`);
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

  else if (elc('clxn_item'))
    fetchCollection(elem.href.split('=')[1]);


  else if (elc('ri-more-2-fill')) {
    const elp = elem.parentElement!.dataset;
    const sta = store.actionsMenu;
    sta.id = elp.id as string;
    sta.title = elp.title as string;
    sta.author = elp.author as string;
    sta.channelUrl = elp.channel_url as string;
    sta.duration = elp.duration as string;
    const dialog = document.createElement('dialog');
    document.body.appendChild(dialog);
    import('../components/ActionsMenu.ts')
      .then(mod => mod.default(dialog));


  }


  else if (elc('listItem')) {

    // to prevent conflicts
    store.actionsMenu.author = '';

    let url = eld.url as string;

    if (!url.startsWith('/channel'))
      url = url.replace('?list=', 's/');

    store.list.name = (
      (location.search.endsWith('music_artists') ||
        (location.pathname === '/library' && state.defaultSuperCollection === 'artists')
      )
        ? 'Artist - ' : ''
    ) + eld.title;
    store.list.uploader = eld.uploader!;

    store.list.thumbnail = eld.thumbnail ? getThumbIdFromLink(eld.thumbnail) : '';

    fetchList(url);
  }
}

