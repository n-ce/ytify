import { createEffect, createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { setStore } from "./app";
import { generateImageUrl } from "../utils";


type PlayerStore = {
  audio: HTMLAudioElement,
  currentTime: number,
  fullDuration: number,
  playbackRate: number,
  isLooping: boolean,
  volume: number,
  title: string,
  author: string,
  channelUrl: string,
  id: string,
  playbackState: 'none' | 'playing' | 'paused' | 'loading',
  mediaArtwork: string,
  hls: {
    src: (arg0: string) => void,
    api: string[],
    manifests: string[]
  },
  supportsOpus: Promise<boolean>,
  data: Piped | undefined,
  legacy: boolean,
  fallback: string,
  immersive: boolean,
  isMusic: boolean,
  audioURL: string,
  videoURL: string,
  dispose: () => void
};


const [playerStore, setPlayerStore] = createStore<PlayerStore>({
  audio: new Audio(),
  playbackState: 'none',
  currentTime: 0,
  fullDuration: 0,
  playbackRate: 1.0,
  isLooping: false,
  volume: 1.0,
  title: '',
  author: '',
  channelUrl: '',
  id: '',
  mediaArtwork: '',
  hls: {
    src: () => '',
    manifests: [],
    api: ['https://pipedapi.kavin.rocks']
  },
  supportsOpus: navigator.mediaCapabilities.decodingInfo({
    type: 'file',
    audio: {
      contentType: 'audio/webm;codecs=opus'
    }
  }).then(res => res.supported),
  data: undefined,
  legacy: !('OffscreenCanvas' in window),
  fallback: '',
  immersive: false,
  isMusic: true,
  audioURL: '',
  videoURL: '',
  dispose() { }
});

const dispose = createRoot((dispose) => {
  createEffect(() => {
    const { audio } = playerStore;
    audio.volume = playerStore.volume;
    audio.playbackRate = playerStore.playbackRate;
    audio.loop = playerStore.isLooping;

    audio.onplaying = () => setPlayerStore('playbackState', 'playing');
    audio.onpause = () => setPlayerStore('playbackState', 'paused');
    audio.onwaiting = () => setPlayerStore('playbackState', 'loading');
    audio.ontimeupdate = () => setPlayerStore('currentTime', audio.currentTime);
    audio.onloadedmetadata = () => setPlayerStore('fullDuration', audio.duration);

  });
  return dispose;
});

setPlayerStore('dispose', dispose);


function convertHHMMSStoSS(duration: string): number {
  const arr = duration.split(':').map(s => parseInt(s));
  let h = 0
  if (arr.length === 3)
    h = arr.shift()! * 3600;

  return h + (arr[0] * 60) + arr[1];
}

export function loadAndPlay(data: CollectionItem) {
  setStore('stream', data);
  setPlayerStore('mediaArtwork', generateImageUrl(data.id, 'maxres', '&w=720&h=720&fit=cover'));
  setPlayerStore('title', data.title);
  setPlayerStore('author', data.author);
  setPlayerStore('channelUrl', data.channelUrl);
  setPlayerStore('fullDuration', convertHHMMSStoSS(data.duration));

}

export { playerStore, setPlayerStore };
