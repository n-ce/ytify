import { createStore } from 'solid-js/store';
import { setStore, store } from './app';
import { config, fetchSearchResultsInvidious, fetchSearchResultsPiped, fetchSearchSuggestions, setConfig } from '../utils';
import { openDialog } from './dialog';
import { closeFeature, navStore, params, setNavStore } from './navigation';


const createInitialState = () => ({
  query: '',
  results: [] as StreamItem[],
  isLoading: false,
  nextPageToken: '',
  page: 1,
  sortBy: '' as 'date' | 'views' | '',
  suggestions: {
    data: [] as string[],
    index: -1,
    controller: new AbortController()
  }
});



export const [searchStore, setSearchStore] = createStore(createInitialState());

export function resetSearch() {
  closeFeature('search');
  setSearchStore(createInitialState());
  setNavStore('params', { q: '', f: 'all' });
}

export function getSearchSuggestions(text: string) {
  if (text.length < 3) {
    setSearchStore('suggestions', 'data', []);
    return;
  }

  const currentApiUrl = store.api.piped[store.api.index.piped];
  searchStore.suggestions.controller.abort();
  const newController = new AbortController();
  setSearchStore('suggestions', 'controller', newController);

  fetchSearchSuggestions(currentApiUrl, text, newController.signal)
    .then(data => {
      setSearchStore('suggestions', 'data', data[1]);
    })
    .catch(e => {
      if (e.name === 'AbortError') return;
      const nextIndex = (store.api.index.piped + 1) % store.api.piped.length;

      if (nextIndex !== 0) {
        setStore('api', 'index', 'piped', nextIndex);
        getSearchSuggestions(text);
      } else {
        openDialog('snackbar', e.message);
        setStore('api', 'index', 'piped', 0);
        setSearchStore('suggestions', 'data', []);
      }
    });
}

const _fetchWithRetry = async (apiType: 'piped' | 'invidious', fetcher: () => Promise<any>) => {
  try {
    const data = await fetcher();
    return data;
  } catch (e: any) {
    console.error(e);
    const { api } = store;
    const nextIndex = (api.index[apiType] + 1) % api[apiType].length;

    if (nextIndex !== 0) {
      setStore('api', 'index', apiType, nextIndex);
      return _fetchWithRetry(apiType, fetcher);
    } else {
      openDialog('snackbar', e.message);
      setStore('api', 'index', apiType, 0);
      return null;
    }
  }
};

export async function getSearchResults() {
  console.log('getSearchResults called');
  const { api } = store;
  const { query, sortBy, page } = searchStore;
  const filter = config.searchFilter || 'all';

  setSearchStore('isLoading', true);
  searchStore.suggestions.controller.abort();
  setSearchStore('suggestions', 'data', []);

  if (sortBy) {
    const data = await _fetchWithRetry('invidious', () =>
      fetchSearchResultsInvidious(api.invidious[api.index.invidious], query, sortBy, page)
    );
    setSearchStore('results', data ? data : []);
  } else {
    const data = await _fetchWithRetry('piped', () =>
      fetchSearchResultsPiped(api.piped[api.index.piped], query, filter)
    );
    if (data) {
      setSearchStore('results', data.items);
      setSearchStore('nextPageToken', data.nextpage);
    } else {
      setSearchStore('results', []);
    }
  }

  setNavStore('params', { q: query, f: filter });

  setSearchStore('isLoading', false);
}



const q = params.get('q');
if (q) {
  if (!navStore.features.search.state)
    setNavStore('features', 'search', 'state', true);
  setConfig('searchFilter', params.get('f') || 'all');
  setSearchStore('query', q);
  getSearchResults();
}
