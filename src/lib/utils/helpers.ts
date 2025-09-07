// import { audio, settingsContainer, title } from "./dom";
// import { getThumbIdFromLink } from "./visualUtils";
// import player from "./player";
//import fetchList from "../modules/fetchList";
// import { fetchCollection, removeFromCollection } from "./libraryUtils";

import { setStore, playerStore, setPlayerStore, store, t } from "../stores";
import { config } from "./config";
import { player } from "./player";


export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];


export const getApi = (
  type: 'piped' | 'invidious',
  index: number = store.api.index.piped
) =>
  store.api[type][index];

const pathModifier = (url: string) => url.includes('=') ?
  'playlists=' + url.split('=')[1] :
  url.slice(1).split('/').join('=');

export const hostResolver = (url: string) =>
  store.linkHost + (store.linkHost.includes(location.origin) ? (url.
    startsWith('/watch') ?
    ('?s' + url.slice(8)) :
    ('/list?' + pathModifier(url))) : url);


export function proxyHandler(url: string, prefetch: boolean = false) {
  const isVideo = Boolean(document.querySelector('video'));
  const useProxy = config.enforceProxy || playerStore.stream.author.endsWith('- Topic') && !isVideo && store.api.status === 'P';
  store.api.index.piped = 0;
  if (!prefetch)
    setPlayerStore('status', t('player_audiostreams_insert'));
  const link = new URL(url);
  const origin = link.origin.slice(8);
  const host = link.searchParams.get('host');

  return useProxy ?
    (url + (host ? '' : `&host=${origin}`)) :
    (host && !config.customInstance) ? url.replace(origin, host) : url;
}


export async function quickSwitch() {
  const { audio, stream, playbackState } = playerStore;
  if (!stream.id) return;
  if (playbackState === 'playing')
    audio.pause();
  const timeOfSwitch = audio.currentTime;
  await player(stream.id);
  setPlayerStore('currentTime', timeOfSwitch);
  audio.play();
}


export async function preferredStream(audioStreams: AudioStream[]) {
  const preferedCodec: 'opus' | 'aac' = config.codec === 'any' ? ((await playerStore.supportsOpus) ? 'opus' : 'aac') : config.codec;
  const itags = ({
    low: {
      opus: [600, 249, 251],
      aac: [599, 139, 140]
    },
    medium: {
      opus: [250, 249, 251],
      aac: [139, 140]
    },
    high: {
      opus: [251],
      aac: [140]
    }
  })[config.quality || 'medium'][preferedCodec];
  let stream!: AudioStream;
  for (const itag of itags) {
    if (stream?.url) continue;
    const v = audioStreams.find(v => v.url.includes(`itag=${itag}`));
    if (v) stream = v;
  }

  return stream;
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
  const useDRC = config.stableVolume && Boolean(audioStreams.find(a => isDRC(a.url)));
  const isOriginal = (a: { url: string }) => !a.url.includes('acont%3Ddubbed');

  return audioStreams
    .filter(a => useDRC ? isDRC(a.url) : !isDRC(a.url))
    .filter(isOriginal);
}

export async function getDownloadLink(id: string): Promise<string | null> {
  const streamUrl = 'https://youtu.be/' + id;
  let dl = '';
  dl = await fetch(store.api.cobalt, {
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
    .catch(e => {
      setStore('snackbar', e.message);
    })

  return dl || '';
}


/*
// TLDR : Stream Item Click Action
export async function superClick(e: Event) {
  const elem = e.target as HTMLAnchorElement & { dataset: CollectionItem };
  if (elem.target === '_blank') return;
  e.preventDefault();

  const eld = elem.dataset;
  const elc = elem.classList.contains.bind(elem.classList);


  if (elc('streamItem'))
    if (elc('delete'))
      removeFromCollection(store.list.id, eld.id as string)
    else {
      if (state.jiosaavn) {
        const sta = store.stream;
        sta.id = eld.id as string;
        sta.title = eld.title as string;
        sta.author = eld.author as string;
        sta.channelUrl = eld.channel_url as string;
        sta.duration = eld.duration as string;
      }
      player(eld.id);
    }

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
*/
