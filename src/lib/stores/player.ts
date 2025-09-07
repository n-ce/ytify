import { createEffect, createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { addToCollection, config, cssVar } from "../utils";
import { navStore, params } from "./navigation";
import { store } from "./app";
import { queueStore } from "./queue";
import audioErrorHandler from "../modules/audioErrorHandler";

const blankImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const msn = 'mediaSession' in navigator;

type PlayerStore = {
  stream: CollectionItem,
  history: string[],
  audio: HTMLAudioElement,
  currentTime: number,
  fullDuration: number,
  playbackRate: number,
  loop: boolean,
  volume: number,
  status: string,
  playbackState: 'none' | 'playing' | 'paused' | 'loading',
  mediaArtwork: string,
  supportsOpus: Promise<boolean>,
  data: Piped | undefined,
  immersive: boolean,
  isMusic: boolean,
  audioURL: string,
  videoURL: string,
  dispose: () => void
};

const createInitialState = (): PlayerStore => ({
  audio: new Audio(),
  playbackState: 'none',
  status: '',
  currentTime: 0,
  fullDuration: 0,
  playbackRate: 1.0,
  loop: false,
  volume: 1.0,
  stream: {
    title: '',
    author: '',
    channelUrl: '',
    id: '',
    duration: ''
  },
  history: [],
  mediaArtwork: blankImage,
  supportsOpus: navigator.mediaCapabilities.decodingInfo({
    type: 'file',
    audio: {
      contentType: 'audio/webm;codecs=opus'
    }
  }).then(res => res.supported),
  data: undefined,
  immersive: false,
  isMusic: true,
  audioURL: '',
  videoURL: '',
  dispose() { }
});

const [playerStore, setPlayerStore] = createStore(createInitialState());

const dispose = createRoot((dispose) => {
  const { audio } = playerStore;
  let historyID: string | undefined = '';
  let historyTimeoutId = 0;

  audio.onplaying = () => {
    setPlayerStore('playbackState', 'playing');
    const { stream, history } = playerStore;
    const { id } = stream;

    if (!history.includes(id))
      setPlayerStore('history', h => [...h, id])

    if (config.history)
      historyTimeoutId = window.setTimeout(() => {
        if (historyID === id)
          addToCollection('history', playerStore.stream, 'addNew');
      }, 1e4);
  }

  audio.onpause = () => {
    setPlayerStore('playbackState', 'paused');
    clearTimeout(historyTimeoutId);
  };

  let isPlayable = false;
  const playableCheckerID = setInterval(() => {
    if (playerStore.history.length || params.has('url') || params.has('text') || !params.has('s')) {
      isPlayable = true;
      clearInterval(playableCheckerID);
    }
  }, 500);

  audio.onloadstart = () => {
    console.log('loadstart');
    setPlayerStore('playbackState', 'paused');
    setPlayerStore('status', '');
    if (isPlayable) audio.play();
    historyID = playerStore.stream.id;
    clearTimeout(historyTimeoutId);
    audio.playbackRate = playerStore.playbackRate;
  }

  audio.onwaiting = () => {
    console.log('waiting');
    setPlayerStore('playbackState', 'loading')
  };

  audio.ontimeupdate = () => {
    if (document.activeElement?.matches('input[type="range"]'))
      return;
    const seconds = Math.floor(audio.currentTime);
    store.lrcSync(seconds);
    const { ref } = navStore.player;
    if (ref) {
      const { offsetHeight, offsetWidth } = ref;
      const diff = offsetHeight - offsetWidth;
      const scale = seconds / playerStore.fullDuration;
      const shift = Math.floor(scale * diff);
      cssVar('--player-bp', `-${shift}px 0`);
    }
    setPlayerStore('currentTime', seconds);
  }

  audio.onloadedmetadata = () => {
    console.log('loadedmetadata');
    setPlayerStore({
      currentTime: 0,
      fullDuration: Math.floor(audio.duration)
    });
  }

  audio.oncanplaythrough = async function() {
    console.log('canplaythrough');
    const nextItem = config.prefetch && queueStore.list[0].id;

    if (!nextItem) return;

    const data = await import('../modules/getStreamData').then(mod => mod.default(nextItem, true));
    const prefetchRef = new Audio();
    prefetchRef.onerror = () => audioErrorHandler(prefetchRef, nextItem);
    if ('audioStreams' in data)
      import('../modules/setAudioStreams')
        .then(mod => mod.default(
          data.audioStreams
            .sort((a: { bitrate: string }, b: { bitrate: string }) => (parseInt(a.bitrate) - parseInt(b.bitrate))
            ),
          data.livestream,
          prefetchRef
        ));
  }

  audio.onerror = () => audioErrorHandler(playerStore.audio);

  createEffect(() => {
    const { audio } = playerStore;
    audio.volume = playerStore.volume;
    audio.playbackRate = playerStore.playbackRate;
    audio.loop = playerStore.loop;
    audio.currentTime = playerStore.currentTime;
    updatePositionState();
  });

  return dispose;
});

setPlayerStore('dispose', dispose);

function updatePositionState() {
  const { audio } = playerStore;
  if (msn && 'setPositionState' in navigator.mediaSession)
    navigator.mediaSession.setPositionState({
      duration: audio.duration || 0,
      playbackRate: audio.playbackRate || 1,
      position: Math.floor(audio.currentTime || 0),
    });
}

export { playerStore, setPlayerStore };
