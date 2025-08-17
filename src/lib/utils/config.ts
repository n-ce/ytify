export let config = {
  enforceProxy: false,
  enforcePiped: false,
  jiosaavn: false,
  defaultSuperCollection: 'featured',
  customInstance: '',
  stableVolume: false,
  prefetch: false,
  HLS: false,
  quality: 'medium' as 'low' | 'medium' | 'high',
  loadImage: true,
  linkHost: '',
  dlFormat: 'opus' as 'opus' | 'mp3' | 'wav' | 'ogg',
  theme: 'auto',
  font: 'system-ui',
  customColor: '',
  roundness: '0.4rem',
  searchSuggestions: true,
  searchFilter: '',
  startupTab: '/search',
  watchMode: '',
  enqueueRelatedStreams: false,
  shuffle: false,
  filterLT10: false,
  allowDuplicates: false,
  history: true,
  discover: true,
  volume: '100',
  shareAction: 'play' as 'play' | 'watch' | 'download',
  dbsync: '',
  language: '',
  codec: 'any' as 'opus' | 'aac' | 'any',
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

type AppConfig = typeof config;


const savedStore = localStorage.getItem('config');
if (savedStore)
  config = JSON.parse(savedStore);


export function setConfig<K extends keyof AppConfig>(key: K, val: AppConfig[K]) {
  config[key] = val;
  const str = JSON.stringify(config);
  localStorage.setItem('config', str);
}







