
export const params = (new URL(location.href)).searchParams;

export let state = {
  enforceProxy: false,
  defaultSuperCollection: 'featured',
  customInstance: '',
  stableVolume: false,
  HLS: false,
  hq: false,
  loadImage: true,
  linkHost: '',
  dlFormat: 'opus',
  theme: 'auto',
  customTheme: '',
  roundness: '0.4rem',
  searchSuggestions: true,
  searchFilter: '',
  startupTab: '/search',
  watchMode: '',
  enqueueRelatedStreams: true,
  discover: true,
  shuffle: false,
  filterLT10: false,
  allowDuplicates: false,
  history: true,
  volume: '100',
  shareAction: 'play',
  dbsync: '',
  language: 'en',
  codec: 'any',
  partsManagerPIN: '',
  'part Reserved Collections': true,
  'part Navigation Library': true,
  'part Featured Playlists': true,
  'part Subscription Feed': true,
  'part Collections': true,
  'part Start Radio': true,
  'part View Author': true,
  'part Playlists': true,
  'part Channels': true,
  'part Watch On': true,
  'part For You': true,
  'part Artists': true,
  'part Albums': true
}

type AppSettings = typeof state;


const savedStore = localStorage.getItem('store');
if (savedStore)
  state = JSON.parse(savedStore);


export function setState<K extends keyof AppSettings>(key: K, val: AppSettings[K]) {
  state[key] = val;
  const str = JSON.stringify(state);
  localStorage.setItem('store', str);
}


export const store: {
  player: {
    playbackState: 'none' | 'playing' | 'paused',
    hls: {
      src: (arg0: string) => void,
      api: string[],
      manifests: string[]
    }
    supportsOpus: Promise<boolean>,
    data: Piped | undefined,
    legacy: boolean,
    fallback: string,
    usePiped: boolean
  },
  lrcSync: (arg0: number) => {} | void,
  queue: {
    list: string[],
    append: (data: DOMStringMap | CollectionItem, prepend?: boolean) => void,
    firstChild: () => HTMLElement | undefined
  },
  stream: CollectionItem,
  streamHistory: string[]
  api: {
    piped: string[],
    invidious: string[],
    hyperpipe: string,
    index: number
  },
  linkHost: string,
  searchQuery: string,
  superCollectionType: 'featured' | 'collections' | 'channels' | 'feed' | 'playlists',
  addToCollectionOptions: string[],
  actionsMenu: CollectionItem,
  list: List & Record<'url' | 'type' | 'uploader', string>,

  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg'
} = {
  player: {
    playbackState: 'none',
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
    usePiped: true
  },
  lrcSync: () => { },
  queue: {
    list: [],
    append: () => { },
    firstChild: () => undefined,
  },
  stream: {
    id: params.get('s') || '',
    title: '',
    author: '',
    duration: '',
    channelUrl: ''
  },
  streamHistory: [],
  api: {
    piped: ['https://pipedapi.kavin.rocks'],
    invidious: ['https://iv.ggtyler.dev'],
    hyperpipe: 'https://hyperpipeapi.onrender.com',
    index: 0
  },
  linkHost: state.linkHost || location.origin,
  searchQuery: '',
  superCollectionType: state.defaultSuperCollection as 'featured',
  actionsMenu: {
    id: '',
    title: '',
    author: '',
    duration: '',
    channelUrl: ''
  },
  list: {
    name: '',
    url: '',
    type: '',
    id: '',
    uploader: '',
    thumbnail: ''
  },
  addToCollectionOptions: [],
  downloadFormat: state.dlFormat as 'opus'
}

