import { setStore, store } from './app';
import { config, drawer, setDrawer } from '@lib/utils';
import { createStore } from 'solid-js/store';
import { updateParam } from './navigation';

const createInitialState = () => ({
  query: '',
  results: [] as (YTItem | YTListItem)[],
  isLoading: false,
  page: 1,
  suggestions: {
    data: [] as string[],
    index: -1,
    controller: new AbortController()
  },
  observer: { disconnect() { } } as IntersectionObserver
});

export const [searchStore, setSearchStore] = createStore(createInitialState());

export function resetSearch() {
  searchStore.observer.disconnect();
  setSearchStore(createInitialState());
  updateParam('q');
  updateParam('f');
}

export function getSearchSuggestions(text: string) {
  if (text.length < 3) {
    setSearchStore('suggestions', 'data', []);
    return;
  }

  setSearchStore('page', 1);
  setSearchStore('suggestions', 'index', -1);

  searchStore.suggestions.controller.abort();
  const newController = new AbortController();
  setSearchStore('suggestions', 'controller', newController);

  const isMusic = ['song', 'artist', 'album'].includes(config.searchFilter);
  const url = `${store.api}/api/search-suggestions?q=${encodeURIComponent(text)}&music=${isMusic}`;

  fetch(url, { signal: newController.signal })
    .then(res => res.json() as Promise<string[]>)
    .then(data => {
      setSearchStore('suggestions', 'data', data);
    })
    .catch(e => {
      if (e.name === 'AbortError') return;
      setStore('snackbar', e.message);
      setSearchStore('suggestions', 'data', []);
    });
}

export async function getSearchResults() {
  const { query } = searchStore;
  const { searchFilter } = config;

  if (!query) return;

  setSearchStore('isLoading', true);
  searchStore.suggestions.controller.abort();
  setSearchStore('suggestions', 'data', []);
  searchStore.observer.disconnect();

  const { recentSearches } = drawer;
  const lc = query.trim().toLowerCase();

  if (config.saveRecentSearches && lc && !lc.includes(' ') && !lc.includes(',')) {
    if (recentSearches.includes(lc)) {
      recentSearches.splice(recentSearches.indexOf(lc), 1);
    }
    recentSearches.push(lc);

    while (recentSearches.length > 7)
      recentSearches.shift();

    setDrawer('recentSearches', recentSearches);
  }

  const url = `${store.api}/api/search?q=${encodeURIComponent(query)}&f=${searchFilter}`;

  fetch(url)
    .then(res => res.json() as Promise<(YTItem | YTListItem)[]>)
    .then(data => {
      setSearchStore('results', data);
    })
    .catch(e => {
      setStore('snackbar', e.message);
      setSearchStore('results', []);
    })
    .finally(() => {
      setSearchStore('isLoading', false);
    });

  updateParam('q', query);
  updateParam('f', searchFilter === 'all' ? '' : searchFilter);
}
