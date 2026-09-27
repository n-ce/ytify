import { createStore } from 'solid-js/store';
import { config, drawer, setDrawer } from '@utils';
import { updateParam, setStore, store } from '@stores';

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

let suggestionTimeout: ReturnType<typeof setTimeout> | undefined;
let lastQuery = '';
const DEBOUNCE_TIME = 400;

export function resetSearch() {
  searchStore.observer.disconnect();
  setSearchStore(createInitialState());
  updateParam('q');
  updateParam('f');
}

function cancelPendingSuggestions() {
  clearTimeout(suggestionTimeout);
  searchStore.suggestions.controller.abort();
}

/**
 * Drops the dropdown for good. Aborting alone is not enough: the debounced fetch
 * may not have started yet, so a pending timer would repopulate the list after a
 * search has already been submitted.
 */
export function clearSuggestions() {
  cancelPendingSuggestions();
  lastQuery = '';
  setSearchStore('suggestions', { data: [], index: -1 });
}

export function getSearchSuggestions(text: string) {
  cancelPendingSuggestions();

  if (text.length < 3) {
    setSearchStore('suggestions', 'data', []);
    lastQuery = '';
    return;
  }

  if (text === lastQuery) return;

  suggestionTimeout = setTimeout(() => {
    lastQuery = text;
    setSearchStore('page', 1);
    setSearchStore('suggestions', 'index', -1);

    const newController = new AbortController();
    setSearchStore('suggestions', 'controller', newController);

    const isMusic = ['song', 'artist', 'album'].includes(config.searchFilter);
    const url = `/search-suggestions?q=${encodeURIComponent(text)}&music=${isMusic}`;

    fetch(url, { signal: newController.signal })
      .then(res => res.json() as Promise<string[]>)
      .then(data => {
        // A resolved-but-aborted response can still land here, so confirm this
        // is still the active request before repopulating the dropdown.
        if (searchStore.suggestions.controller !== newController) return;
        setSearchStore('suggestions', 'data', data);
      })
      .catch(e => {
        if (e.name === 'AbortError') return;
        setStore('snackbar', e.message);
        setSearchStore('suggestions', 'data', []);
      });
  }, DEBOUNCE_TIME);
}

export async function getSearchResults(force = false) {
  const { query, results, isLoading } = searchStore;
  const { searchFilter } = config;

  if (!query || (isLoading && !force)) return;
  if (!force && results.length > 0) return;

  setSearchStore('isLoading', true);
  clearSuggestions();
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

  const url = `${store.api}/search?q=${encodeURIComponent(query)}&f=${searchFilter}`;

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
