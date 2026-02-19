import { setStore, playerStore, setPlayerStore, t } from "../stores";
import { config } from "./config";
import { player } from "./player";
import getStreamData from "../modules/getStreamData";

export * from './pure';

const pathModifier = (url: string) => url.includes('=') ?
  'playlists=' + url.split('=')[1] :
  url.slice(1).split('/').join('=');

export const hostResolver = (url: string, host = location.origin) =>
  host + (host.includes(location.origin) ? (url.
    startsWith('/watch') ?
    ('?s' + url.slice(8)) :
    ('?' + pathModifier(url))) : url);

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
  const proxy = playerStore.proxy;

  return useProxy && proxy && !url.includes('&fallback') ?
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

export function handleXtags(audioStreams: AudioStream[]) {
  const isDRC = (url: string) => url.includes('drc%3D1');
  const useDRC = config.stableVolume && Boolean(audioStreams.find(a => isDRC(a.url)));
  const isOriginal = (a: { url: string }) => !a.url.includes('acont%3Ddubbed');

  return audioStreams
    .filter(a => useDRC ? isDRC(a.url) : !isDRC(a.url))
    .filter(isOriginal);
}


type ErrorResponse = Record<'error' | 'message', string>;

function isErrorResponse(data: Invidious | ErrorResponse): data is ErrorResponse {
  return 'error' in data || 'message' in data;
}

export async function getDownloadLink(id: string): Promise<void> {
  setStore('snackbar', t('actions_menu_downloading'));

  return getStreamData(id)
    .then(data => {
      if (isErrorResponse(data)) {
        throw new Error(data.error || data.message || 'Unknown error');
      }

      const { adaptiveFormats, title } = data;
      const audioStreams = adaptiveFormats.filter(s => s.type.startsWith('audio/'));

      if (audioStreams.length === 0) throw new Error('No audio streams found');

      // Always prefer opus and highest bitrate (itag 251)
      let selectedStream = audioStreams.find(s => s.url.includes('itag=251'));
      if (!selectedStream) {
        selectedStream = audioStreams.find(s => s.type.includes('opus')) || audioStreams[0];
      }

      const downloadUrl = proxyHandler(selectedStream.url, true);

      return fetch(downloadUrl)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch stream');
          return res.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const ext = (selectedStream.type.includes('webm') || selectedStream.type.includes('opus')) ? 'opus' : 'm4a';
          const filename = `${title.replace(/[/\\?%*:|"<>]/g, '-')}.${ext}`;

          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 100);

          setStore('snackbar', t('actions_menu_download_success'));
        });
    })
    .catch(e => {
      const message = e instanceof Error ? e.message : 'Download failed';
      setStore('snackbar', message);
    });
}
