export const store: {
  player: {
    playbackState: 'none' | 'playing' | 'paused',
    HLS: boolean,
    codec: 'any' | 'opus' | 'aac',
    hq: boolean,

  },
  theme: {
    scheme: 'auto' | 'light' | 'dark',
    highContrast: boolean,
    roundness: 'none' | '2vmin' | '4vmin' | '8vmin'
  },
  api: Record<'name' | 'piped' | 'invidious', string>[],
  imageProxy: string,
  loadImage: 'off' | 'lazy' | 'eager',
  linkHost: string,
  searchQuery: string,
  upcomingQuery: string,
  superCollectionType: 'featured' | 'collections' | 'channels' | 'feed' | 'playlists'
} = {
  player: {
    playbackState: 'none',
    HLS: Boolean(localStorage.getItem('HLS')),
    codec: 'opus',
    hq: false

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
  // Hardcoded 
  imageProxy: 'https://pipedimg.adminforge.de',
  loadImage: localStorage.getItem('imgLoad') as 'off' | 'lazy' || 'eager',
  linkHost: localStorage.getItem('linkHost') || location.origin,
  searchQuery: '',
  upcomingQuery: '',
  superCollectionType: 'featured'
}

