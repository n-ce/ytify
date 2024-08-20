import type Hls from "hls.js";

export const params = (new URL(location.href)).searchParams;

export const getSaved = localStorage.getItem.bind(localStorage);

export const store: {
  player: {
    playbackState: 'none' | 'playing' | 'paused',
    HLS: Hls | undefined,
    hq: boolean,
    codec: 'opus' | 'aac' | 'any'
    supportsOpus: Promise<boolean>
  },
  queue: {
    array: string[]
  }
  stream: CollectionItem,
  theme: {
    scheme: 'auto' | 'light' | 'dark',
    highContrast: boolean,
    roundness: 'none' | '2vmin' | '4vmin' | '8vmin'
  },
  api: Record<'name' | 'piped' | 'invidious' | 'hyperpipe', string>[],
  loadImage: 'off' | 'lazy' | 'eager',
  linkHost: string,
  searchQuery: string,
  upcomingQuery: string,
  superCollectionType: 'featured' | 'collections' | 'channels' | 'feed' | 'playlists',
  actionsMenu: CollectionItem,
  list: Record<'name' | 'url' | 'type' | 'id' | 'uploader' | 'thumbnail', string>
} = {
  player: {
    playbackState: 'none',
    HLS: undefined,
    hq: Boolean(getSaved('hq')),
    codec: 'opus',
    supportsOpus: navigator.mediaCapabilities.decodingInfo({
      type: 'file',
      audio: {
        contentType: 'audio/ogg;codecs=opus'
      }
    }).then(res => res.supported)
  },
  queue: { array: [] },
  stream: {
    id: params.get('s') || '',
    title: '',
    author: '',
    duration: '',
    channelUrl: ''
  },
  theme: {
    scheme: 'auto',
    highContrast: false,
    roundness: '2vmin'
  },
  api: [
    {
      name: 'Custom',
      piped: 'https://pipedapi.kavin.rocks',
      invidious: 'https://invidious.fdn.fr',
      hyperpipe: 'https://hyperpipeapi.onrender.com'
    }
  ],
  loadImage: getSaved('imgLoad') as 'off' | 'lazy' || 'eager',
  linkHost: getSaved('linkHost') || location.origin,
  searchQuery: '',
  upcomingQuery: '',
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
  }
}

