import { createStore } from 'solid-js/store';
import { setStore, store } from './app';
import { config, fetchSearchResultsInvidious, fetchSearchResultsPiped, fetchSearchSuggestions } from '../utils';
import { openDialog } from './dialog';

export const [searchStore, setSearchStore] = createStore({
  query: '',
  results: [] as StreamItem[],
  isLoading: false,
  nextPageToken: '',
  page: 1,
  sortBy: '' as 'date' | 'views' | '',
  suggestions: {
    data: [] as string[],
    index: -1
  }
});

let debounceTimeoutId: number;

export function getSearchSuggestions(text: string) {
  clearTimeout(debounceTimeoutId);

  if (text.length < 3) {
    setSearchStore('suggestions', 'data', []);
    return;
  }

  debounceTimeoutId = window.setTimeout(() => {
    const currentApiUrl = store.api.piped[store.api.index.piped];

    fetchSearchSuggestions(currentApiUrl, text)
      .then(data => {
        setSearchStore('suggestions', 'data', data[1]);
      })
      .catch(e => {
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
  }, 300);
}

const _fetchWithRetry = async (apiType: 'piped' | 'invidious', fetcher: () => Promise<any>) => {
  try {
    const data = await fetcher();
    return data;
  } catch (e: any) {
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
  const { api } = store;
  const { query, sortBy, page } = searchStore;
  const filter = config.searchFilter || 'all';

  setSearchStore('isLoading', true);
  setSearchStore('suggestions', 'data', []);

  if (sortBy) {
    const data = await _fetchWithRetry('invidious', () =>
      fetchSearchResultsInvidious(api.invidious[api.index.invidious], query, sortBy, page)
    );
    if (data) {
      setSearchStore('results', data);
    } else {
      setSearchStore('results', []);
    }
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

  setSearchStore('isLoading', false);
}
