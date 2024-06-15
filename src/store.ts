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
  linkHost: string
} = {
  player: {
    playbackState: 'none',
    HLS: false,
    codec: 'opus',
    hq: false

  },
  theme: {
    scheme: 'auto',
    highContrast: false,
    roundness: '2vmin'
  },
  linkHost: 'https://youtube.com',
}

