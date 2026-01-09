import { setStore, store } from './app';
import { config, drawer, setDrawer } from '@lib/utils';
import { updateParam } from './navigation';
import { createStore } from 'solid-js/store';
import fetchSearchSuggestions from '@lib/modules/fetchSearchSuggestions';
import fetchYoutubeSearchResults from '@lib/modules/fetchYoutubeSearchResults';
import fetchYTMusicSearchResults from '@lib/modules/fetchYTMusicSearchResults';

const createInitialState = () => ({
  query: '',
  results: [] as (YTStreamItem | YTListItem)[],
  isLoading: false,
  page: 1,
  suggestions: {
    data: drawer.recentSearches,
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

  fetchSearchSuggestions(text, newController.signal)
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
  const { query, page, observer } = searchStore;
  const { searchFilter } = config;

  if (!query) return;

  setSearchStore('isLoading', true);
  searchStore.suggestions.controller.abort();
  setSearchStore('suggestions', 'data', []);
  observer.disconnect();

  const { recentSearches } = drawer;
  const lc = query.trim().toLowerCase();

  if (config.saveRecentSearches && lc) {
    while (recentSearches.length > 4)
      recentSearches.shift();

    if (!recentSearches.includes(lc))
      recentSearches.push(lc);

    setDrawer('recentSearches', recentSearches);
  }

  const isMusic = searchFilter.startsWith('music_');

  const getData = (): Promise<(YTStreamItem | YTListItem)[]> => {
    if (isMusic)
      return fetchYTMusicSearchResults(query);
    else {
      let invidiousIndex = store.invidious.length - 1;
      const fetcher = (): Promise<(YTStreamItem | YTListItem)[]> =>
        fetchYoutubeSearchResults(
          store.invidious[invidiousIndex],
          query,
          searchFilter,
          page
        ).catch(e => {
          if (invidiousIndex > 0) {
            invidiousIndex--;
            return fetcher();
          } else throw e;

        });
      return fetcher();
    }
  }

  getData()
    .then(data => {
      setSearchStore('results', data);
      if (!isMusic) {
        setSearchStore('page', page + 1);
        const callback = async () => {
          const moreData = await fetchYoutubeSearchResults(
            store.invidious[store.invidious.length - 1],
            query,
            searchFilter,
            searchStore.page
          );
          if (moreData) {
            const existingIds = new Set(searchStore.results.map(item => 'id' in item ? item.id : item.url));
            const uniqueMoreData = moreData.filter(item => !existingIds.has('id' in item ? item.id : item.url));
            setSearchStore('results', [...searchStore.results, ...uniqueMoreData]);
            setSearchStore('page', searchStore.page + 1);
          }
        };
        setSearchStore('observer', setObserver(callback));
        if (data.length < 5) {
          callback();
        }
      }
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

function setObserver(callback: () => Promise<void>): IntersectionObserver {
  const ref = document.querySelector(`.searchlist a:nth-last-child(5)`) as HTMLElement;
  if (!ref) return { disconnect() { } } as IntersectionObserver;
  const obs = new IntersectionObserver(async (entries, observer) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        observer.disconnect();
        await callback();
        setSearchStore('observer', setObserver(callback));
      }
    }
  });
  obs.observe(ref);

  return obs;
}
