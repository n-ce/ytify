import { setStore, playerStore, setPlayerStore, store, t } from "@lib/stores";
import { config } from "./config";
import { player } from "./player";


export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];


export const getApi = (
  index: number = store.index
) =>
  store.invidious[index];

const pathModifier = (url: string) => url.includes('=') ?
  'playlists=' + url.split('=')[1] :
  url.slice(1).split('/').join('=');

export const hostResolver = (url: string) =>
  store.linkHost + (store.linkHost.includes(location.origin) ? (url.
    startsWith('/watch') ?
    ('?s' + url.slice(8)) :
    ('?' + pathModifier(url))) : url);


export const fetchJson = async <T>(
  url: string,
  signal?: AbortSignal
): Promise<T> => fetch(url, { signal })
  .then(res => {
    if (!res.ok)
      throw new Error(`Network response was not ok: ${res.statusText}`);
    return res.json() as Promise<T>;
  });


export function proxyHandler(
  url: string,
  prefetch?: boolean
) {
  const isVideo = Boolean(document.querySelector('video'));
  const useProxy = playerStore.stream.author?.endsWith('- Topic') && !isVideo;

  if (!prefetch)
    setPlayerStore('status', t('player_audiostreams_insert'));

  const link = new URL(url);
  const origin = link.origin;
  const proxy = getApi(0);

  return useProxy ?
    url.replace(origin, proxy) : url;
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
  const preferedCodec = (await playerStore.supportsOpus) ? 'opus' : 'aac';

  const itags = ({
    worst: {
      opus: [600, 249, 251],
      aac: [599, 139, 140]
    },
    low: {
      opus: [249, 600, 251],
      aac: [139, 599, 140]
    },
    medium: {
      opus: [250, 249, 251],
      aac: [139, 140]
    },
    high: {
      opus: [251],
      aac: [140]
    },
    lossless: {
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

export const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

export function handleXtags(audioStreams: AudioStream[]) {
  const isDRC = (url: string) => url.includes('drc%3D1');
  const useDRC = config.stableVolume && Boolean(audioStreams.find(a => isDRC(a.url)));
  const isOriginal = (a: { url: string }) => !a.url.includes('acont%3Ddubbed');

  return audioStreams
    .filter(a => useDRC ? isDRC(a.url) : !isDRC(a.url))
    .filter(isOriginal);
}



interface CobaltSuccessResponse {
  status: 'success';
  url: string;
}

interface CobaltTunnelResponse {
  audio: object;
  bitrate: string;
  copy: boolean;
  cover: boolean;
  cropCover: boolean;
  format: string;
  isHLS: boolean;
  output: {
    filename: string;
    metadata: {
      album: string;
      artist: string;
      copyright: string;
      date: string;
      title: string;
    };
    type: string;
  };
  service: string;
  status: string;
  tunnel: string[];
  type: 'audio';
}

interface CobaltErrorResponse {
  status: 'error';
  error: {
    code: string;
  };
}

type CobaltResponse = CobaltSuccessResponse | CobaltTunnelResponse | CobaltErrorResponse;

export function getDownloadLink(id: string): void {
  setStore('snackbar', t('actions_menu_download_init'));
  const streamUrl = 'https://youtu.be/' + id;
  const api = 'https://cobalt-api.meowing.de';
  if (!api) return;

  fetch(api, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: streamUrl,
      downloadMode: 'audio',
      audioFormat: store.downloadFormat,
      filenameStyle: 'basic'
    })
  })
    .then(response => response.json() as Promise<CobaltResponse>)
    .then(async data => {
      let url: string | undefined;
      let filename = '';

      if ('tunnel' in data && data.tunnel.length > 0) {
        url = data.tunnel[0];
        filename = data.output.filename;
        await navigator?.clipboard?.writeText(filename);
        setStore('snackbar', 'Filename copied to clipboard');

      } else if ('url' in data) {
        url = data.url;
      } else if ('error' in data) {
        throw new Error(data.error?.code || 'Invalid response from download server');
      }

      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      } else {
        throw new Error('No download link found');
      }
    })
    .catch(e => {
      setStore('snackbar', e.message);
    });
}
