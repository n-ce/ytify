export let config = {
  home: '',
  stableVolume: false,
  prefetch: false,
  HLS: false,
  quality: 'medium' as 'low' | 'medium' | 'high',
  loadImage: true,
  linkHost: location.origin,
  dlFormat: 'opus' as 'opus' | 'mp3' | 'wav' | 'ogg',
  theme: 'auto' as 'auto' | 'light' | 'dark',
  landscapeSections: '3',
  roundness: '0.4rem',
  searchSuggestions: true,
  searchBarLinkCapture: true,
  searchFilter: 'all',
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







