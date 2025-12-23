export let config = {
  home: '',
  stableVolume: false,
  prefetch: false,
  quality: 'medium' as 'low' | 'medium' | 'high' | 'worst',
  loadImage: true,
  theme: 'auto' as 'auto' | 'light' | 'dark',
  landscapeSections: '2',
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
  sortOrder: 'modified' as 'modified' | 'name' | 'artist' | 'duration'
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







