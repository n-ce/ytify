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
  queue: string[]
  stream: CollectionItem,
  streamHistory: string[]
  api: {
    list: APIList[],
    index: number,
    type: 'piped' | 'invidious'
  },
  loadImage: 'off' | 'lazy' | 'eager',
  linkHost: string,
  searchQuery: string,
  upcomingQuery: string,
  superCollectionType: 'featured' | 'collections' | 'channels' | 'feed' | 'playlists',
  actionsMenu: CollectionItem,
  list: List & Record<'url' | 'type' | 'uploader', string>,
  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg'
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
    list:
      [
        {
          "name": "Official 🌐",
          "piped": "https://pipedapi.kavin.rocks",
          "invidious": "https://invidious.fdn.fr",
          "hyperpipe": "https://hyperpipeapi.onrender.com"
        }
      ],
    index: 0,
    type: (!getSaved('HLS') && getSaved('fetchViaIV'))
      ? 'invidious' : 'piped'
  },
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
  },
  downloadFormat: getSaved('dlFormat') as 'opus' || 'opus'
}

