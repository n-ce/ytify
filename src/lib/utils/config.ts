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
  manualOrdering: true,
  durationFilter: '',
  allowDuplicates: false,
  similarContent: false,
  contextualFill: false,
  queuePrefetch: false,
  authorGrouping: false,
  home: '',
  searchFilter: 'all',
  volume: '100',
  dbsync: '',
  sortOrder: 'modified' as 'modified' | 'name' | 'artist' | 'duration'
}

type AppConfig = typeof config;


import { safeJsonParse } from "@lib/utils/safe";

const savedStore = localStorage.getItem('config');
if (savedStore) {
  const parsed = safeJsonParse(savedStore, null);
  if (parsed) config = parsed;
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
  lastUsedQueueAction: '',
  discovery: [] as (CollectionItem & { frequency: number })[],
  userArtists: [] as Channel[],
  relatedPlaylists: [] as Playlist[],
  relatedArtists: [] as Channel[],
  subfeed: [] as CollectionItem[],
}
const savedDrawer = localStorage.getItem('drawer');
if (savedDrawer) {
  const parsed = safeJsonParse(savedDrawer, null);
  if (parsed) drawer = parsed;
}

type AppDrawer = typeof drawer;

export function setDrawer<K extends
  keyof AppDrawer>(key: K, val: AppDrawer[K]) {
  drawer[key] = val;
  const str = JSON.stringify(drawer);
  localStorage.setItem('drawer', str);
}