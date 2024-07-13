
export const params = (new URL(location.href)).searchParams;

export const getSaved = localStorage.getItem.bind(localStorage);

export const store: {
  player: {
    playbackState: 'none' | 'playing' | 'paused',
    HLS: boolean,
    hq: boolean,
    codec: 'opus' | 'aac' | 'any'
    supportsOpus: boolean
  },
  stream: Record<'id' | 'title' | 'author' | 'duration' | 'channelUrl', string>,
  theme: {
    scheme: 'auto' | 'light' | 'dark',
    highContrast: boolean,
    roundness: 'none' | '2vmin' | '4vmin' | '8vmin'
  },
  api: Record<'name' | 'piped' | 'invidious', string>[],
  loadImage: 'off' | 'lazy' | 'eager',
  linkHost: string,
  searchQuery: string,
  upcomingQuery: string,
  superCollectionType: 'featured' | 'collections' | 'channels' | 'feed' | 'playlists',
  list: Record<'name' | 'url' | 'type' | 'id' | 'uploader' | 'thumbnail', string>
} = {
  player: {
    playbackState: 'none',
    HLS: Boolean(getSaved('HLS')),
    hq: Boolean(getSaved('hq')),
    codec: 'opus',
    supportsOpus: await navigator.mediaCapabilities.decodingInfo({
      type: 'file',
      audio: {
        contentType: 'audio/ogg;codecs=opus'
      }
    }).then(res => res.supported)
  },
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
      invidious: 'https://invidious.fdn.fr'
    }
  ],
  loadImage: getSaved('imgLoad') as 'off' | 'lazy' || 'eager',
  linkHost: getSaved('linkHost') || location.origin,
  searchQuery: '',
  upcomingQuery: '',
  superCollectionType: 'featured',
  list: {
    name: '',
    url: '',
    type: '',
    id: '',
    uploader: '',
    thumbnail: ''
  }
}

