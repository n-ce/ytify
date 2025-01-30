export const params = (new URL(location.href)).searchParams;

export const getSaved = localStorage.getItem.bind(localStorage);

export const store: {
  player: {
    playbackState: 'none' | 'playing' | 'paused',
    hls: {
      on: boolean,
      src: (arg0: string) => void,
      api: string[],
      manifests: string[]
    }
    hq: boolean,
    codec: 'opus' | 'aac' | 'any'
    supportsOpus: Promise<boolean>,
    data: Piped | undefined,
    legacy: boolean,
    fallback: string,
    usePiped: boolean
  },
  lrcSync: (arg0: number) => {} | void,
  queue: string[],
  stream: CollectionItem,
  streamHistory: string[]
  api: {
    piped: string[],
    invidious: string[],
    hyperpipe: string,
    index: number
  },
  loadImage: boolean,
  linkHost: string,
  searchQuery: string,
  superCollectionType: 'featured' | 'collections' | 'channels' | 'feed' | 'playlists',
  actionsMenu: CollectionItem,
  list: List & Record<'url' | 'type' | 'uploader', string>,
  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg'
} = {
  player: {
    playbackState: 'none',
    hls: {
      on: Boolean(getSaved('HLS')),
      src: () => '',
      manifests: [],
      api: ['https://pipedapi.kavin.rocks']
    },
    hq: Boolean(getSaved('hq')),
    codec: 'opus',
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
  lrcSync: () => '',
  queue: [],
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
  loadImage: getSaved('imgLoad') !== 'off',
  linkHost: getSaved('linkHost') || location.origin,
  searchQuery: '',
  superCollectionType: 'featured',
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
  downloadFormat: getSaved('dlFormat') as 'opus' || 'opus'
}

