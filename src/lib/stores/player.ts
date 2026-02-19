import { createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { addToCollection, config, cssVar, player, themer } from "@lib/utils";
import { instances } from "@lib/utils/pure";
import { navStore, params, updateParam } from "./navigation";
import { addToQueue, queueStore, setQueueStore } from "./queue";
import audioErrorHandler from "@lib/modules/audioErrorHandler";
import { setStore, store } from "./app";
import getStreamData from "../modules/getStreamData";

const blankImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

type PlayerStore = {
  stream: TrackItem & { albumId?: string },
  history: TrackItem[],
  audio: HTMLAudioElement,
  context: {
    src: Context,
    id: string
  }
  currentTime: number,
  fullDuration: number,
  playbackRate: number,
  loop: boolean,
  volume: number,
  status: string,
  playbackState: 'none' | 'playing' | 'paused' | 'loading',
  mediaArtwork: string,
  supportsOpus: Promise<boolean>,
  data: {},
  immersive: boolean,
  isMusic: boolean,
  audioURL: string,
  videoURL: string,
  isWatching: boolean,
  proxy: string,
  lrcSync?: (d: number) => void
};

const createInitialState = (): PlayerStore => ({
  audio: new Audio(),
  playbackState: 'none',
  context: { id: 'query', src: 'link' },
  status: '',
  currentTime: 0,
  fullDuration: 0,
  playbackRate: 1.0,
  loop: false,
  volume: parseFloat(config.volume) / 100,
  stream: {
    title: '',
    author: '',
    authorId: '',
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
  data: {},
  immersive: false,
  isMusic: true,
  audioURL: '',
  videoURL: '',
  isWatching: Boolean(config.watchMode),
  proxy: instances[Math.floor(Math.random() * instances.length)]
});

const [playerStore, setPlayerStore] = createStore(createInitialState());

export function playNext() {
  const { stream } = playerStore;
  const { list } = queueStore;
  const nextStream = list[0];
  setPlayerStore('history', h => [{ ...stream }, ...h]);
  setPlayerStore('stream', nextStream);
  setQueueStore('list', l => l.slice(1));
  player(nextStream.id);

}

export function playPrev() {
  const { history, stream } = playerStore;

  const prevStream = history[0];
  setPlayerStore('history', h => h.slice(1));
  setQueueStore('list', l => [{ ...stream }, ...l]);

  setPlayerStore('stream', prevStream);
  player(prevStream.id);
}

createRoot(() => {
  let historyID: string | undefined = '';
  let historyTimeoutId = 0;

  playerStore.audio.volume = playerStore.volume;

  playerStore.audio.onended = () => {
    if (queueStore.list.length)
      playNext();
    else {
      updateParam('s');
      setPlayerStore('playbackState', 'none');
    }
  }

  playerStore.audio.onplaying = () => {
    setPlayerStore('playbackState', 'playing');
    const { stream } = playerStore;
    const { id } = stream;

    if (config.history)
      historyTimeoutId = window.setTimeout(() => {
        if (historyID === id) {
          if (
            config.similarContent
            && playerStore.isMusic
          )
            getRecommendations();
          addToCollection('history', [playerStore.stream]);
        }
      }, 1e4);
  }

  playerStore.audio.onpause = () => {
    setPlayerStore('playbackState', 'paused');
    clearTimeout(historyTimeoutId);
  };
  playerStore.audio.addEventListener('loadeddata', themer);


  let isPlayable = false;
  const playableCheckerID = setInterval(() => {
    if (playerStore.history.length || params.has('url') || params.has('text') || !params.has('s')) {
      isPlayable = true;
      clearInterval(playableCheckerID);
    }
  }, 500);

  playerStore.audio.onloadstart = () => {
    setPlayerStore('playbackState', 'paused');
    setPlayerStore('status', '');
    if (isPlayable) playerStore.audio.play();

    historyID = playerStore.stream.id;
    clearTimeout(historyTimeoutId);
    playerStore.audio.playbackRate = playerStore.playbackRate;
  }

  playerStore.audio.onwaiting = () => {
    setPlayerStore('playbackState', 'loading')
  };

  playerStore.audio.ontimeupdate = () => {
    if (document.activeElement?.matches('input[type="range"]'))
      return;

    const { audio, lrcSync, fullDuration, isMusic } = playerStore;

    // Lyrics
    if (lrcSync)
      lrcSync(audio.currentTime);

    const seconds = Math.floor(audio.currentTime);


    setPlayerStore('currentTime', seconds);


    // Immersive Mode
    const { ref } = navStore.player;
    if (ref) {
      const { offsetHeight, offsetWidth } = ref;
      const diff = isMusic ? (offsetHeight - offsetWidth) : offsetWidth;
      const scale = seconds / fullDuration;
      const shift = Math.floor(scale * diff);
      cssVar('--player-bp', `-${shift}px 0`);
    }

    const t = params.get('t');

    if (t) {
      if (isMusic) updateParam('t');
      else {
        if (seconds % 5 === 0) {
          const str = seconds.toString();
          if (t !== str)
            updateParam('t', str);
        }
      }
    }


  }

  playerStore.audio.onloadedmetadata = () => {
    setPlayerStore({
      currentTime: 0,
      fullDuration: Math.floor(playerStore.audio.duration)
    });
  }

  playerStore.audio.oncanplaythrough = async function() {
    const nextItem = config.queuePrefetch && queueStore.list[0]?.id;

    if (!nextItem) return;

    const data = await getStreamData(nextItem, true);
    const prefetchRef = new Audio();
    prefetchRef.onerror = () => audioErrorHandler(prefetchRef, nextItem);
    if (data && 'adaptiveFormats' in data)
      import('../modules/setAudioStreams')
        .then(mod => mod.default(
          data.adaptiveFormats
            .filter(f => f.type.startsWith('audio'))
            .sort((a, b) => (parseInt(a.bitrate) - parseInt(b.bitrate))),
          prefetchRef
        ));
  }

  playerStore.audio.onerror = () => audioErrorHandler(playerStore.audio);

});

async function getRecommendations() {

  const title = encodeURIComponent(playerStore.stream.title);
  const artist = encodeURIComponent(playerStore.stream.author?.slice(0, -8) ?? '');
  fetch(`${store.api}/api/similar?title=${title}&artist=${artist}&limit=10`)
    .then(res => res.json())
    .then(addToQueue)
    .catch(e => setStore('snackbar', `Could not get recommendations for the track: ${e.message}`));

}


export { playerStore, setPlayerStore };
