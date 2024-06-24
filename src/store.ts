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
  loadImage: localStorage.getItem('imgLoad') as 'off' | 'lazy' || 'eager',
  linkHost: 'https://youtube.com',
  searchQuery: '',
  upcomingQuery: '',
  superCollectionType: 'featured'
}
