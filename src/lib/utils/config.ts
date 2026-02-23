export let config = {
  language: '',
  shareAction: 'play' as 'play' | 'watch' | 'download',
  quality: 'medium' as 'low' | 'medium' | 'high' | 'worst',
  stableVolume: false,
  watchMode: '',
  discover: true,
  history: true,
  searchBarLinkCapture: true,
  searchSuggestions: true,
  saveRecentSearches: true,
  loadImage: true,
  landscapeSections: '2',
  roundness: '0.4rem',
  theme: 'auto' as 'auto' | 'light' | 'dark',
  persistentShuffle: false,
  durationFilter: '',
  similarContent: false,
  contextualFill: false,
  queuePrefetch: false,
  authorGrouping: false,
  searchFilter: 'all',
  volume: '100',
  dbsync: '',
  sortBy: 'modified' as 'modified' | 'name' | 'artist' | 'duration',
  sortOrder: 'desc' as 'asc' | 'desc'
}

type AppConfig = typeof config;


const savedStore = localStorage.getItem('config');
if (savedStore) {
  const parsed = JSON.parse(savedStore) as Record<string, unknown>;
  (Object.keys(config) as (keyof AppConfig)[]).forEach(key => {
    if (parsed[key] !== undefined) {
      (config as Record<keyof AppConfig, unknown>)[key] = parsed[key];
    }
  });
}


export function setConfig<K extends
  keyof AppConfig>(key: K, val: AppConfig[K]) {
  config[key] = val;
  const str = JSON.stringify(config);
  localStorage.setItem('config', str);
}

/* Transitory local saves thats not supposed to be transferrable */

export let drawer = {
  recentSearches: [] as string[],
  discovery: [] as (YTItem & { frequency: number })[],
  lastMainFeature: 'search' as 'search' | 'library',
  libraryPlays: {} as Record<string, number>,
}
const savedDrawer = localStorage.getItem('drawer');
if (savedDrawer) {
  const parsed = JSON.parse(savedDrawer) as Record<string, unknown>;
  (Object.keys(drawer) as (keyof AppDrawer)[]).forEach(key => {
    if (parsed[key] !== undefined) {
      (drawer as Record<keyof AppDrawer, unknown>)[key] = parsed[key];
    }
  });
}

type AppDrawer = typeof drawer;

export function setDrawer<K extends
  keyof AppDrawer>(key: K, val: AppDrawer[K]) {
  drawer[key] = val;
  const str = JSON.stringify(drawer);
  localStorage.setItem('drawer', str);
}
