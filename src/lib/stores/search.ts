// @ts-ignore

import { setStore, store } from './app';
import { config, fetchMoreSearchResultsPiped, fetchSearchResultsInvidious, fetchSearchResultsPiped, fetchSearchSuggestions } from '../utils';
import { updateParam } from './navigation';
import { createStore } from 'solid-js/store';

const createInitialState = () => ({
  query: '',
  results: [] as StreamItem[],
  isLoading: false,
  nextPageToken: '',
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
  console.log(searchStore);
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

      setStore('api', 'index', 'piped', nextIndex);
      if (nextIndex !== 0)
        getSearchSuggestions(text);
      else {
        setStore('snackbar', e.message);
        setSearchStore('suggestions', 'data', []);
      }
    });
}

export async function getSearchResults() {
  const { api } = store;
  const { query, page, observer } = searchStore;
  const { searchFilter } = config;

  if (!query) return;

  console.log('getSearchResults called');

  setSearchStore('isLoading', true);
  searchStore.suggestions.controller.abort();
  setSearchStore('suggestions', 'data', []);
  observer.disconnect();

  const useInvidious = searchFilter === 'views' || searchFilter === 'date';

  const processResults = (results: StreamItem[]): StreamItem[] => {
    if (searchFilter === 'music_songs') {
      return results.map(
        (item: StreamItem) => {
          if (item.uploaderName && !item.uploaderName.endsWith(' - Topic'))
            item.uploaderName += ' - Topic';
          return item;
        }
      );
    }
    return results;
  };

  const getData = (): Promise<StreamItem[] | { items: StreamItem[], nextpage: string }> =>
    (useInvidious
      ? fetchSearchResultsInvidious(
        api.invidious[api.index.invidious],
        query,
        searchFilter,
        page
      )
      : fetchSearchResultsPiped(
        api.piped[api.index.piped],
        query,
        searchFilter
      )
    ).catch(async (e): Promise<StreamItem[] | { items: StreamItem[], nextpage: string }> => {
      const type = useInvidious ? 'invidious' : 'piped';

      const nextIndex = (api.index[type] + 1) % api[type].length;

      setStore('api', 'index', type, nextIndex);

      if (nextIndex !== 0) return await getData();
      else {
        setStore('snackbar', e.message);
        return useInvidious ? [] : { nextpage: 'null', items: [] };
      }
    });

  const data = await getData();

  if (useInvidious) {
    if (data) {
      setSearchStore({
        page: page + 1,
        results: (data as StreamItem[]).filter((x: StreamItem) => x.lengthSeconds > 65),
      });
    } else {
      setSearchStore('results', []);
    }
  } else {
    const { items, nextpage } = data as { items: StreamItem[], nextpage: string };
    if (!items) {
      setSearchStore('results', []);
      return;
    }

    setSearchStore({
      nextPageToken: nextpage,
      results: processResults(items),
    });
  }

  async function callback() {
    if (useInvidious) {
      const data = await fetchSearchResultsInvidious(
        api.invidious[api.index.invidious],
        query,
        searchFilter,
        searchStore.page
      );
      if (data) {
        setSearchStore('results', [...searchStore.results, ...data as StreamItem[]]);
        setSearchStore('page', searchStore.page + 1);
      }
    } else {
      const more = await fetchMoreSearchResultsPiped(
        api.piped[api.index.piped],
        searchStore.nextPageToken || 'null',
        query,
        searchFilter
      );
      const newResults = [
        ...searchStore.results,
        ...processResults(more.items.filter(
          (item: StreamItem) =>
            !item.isShort &&
            item.duration !== -1 &&
            !searchStore.results.find((v) => v.url === item.url)
        )),
      ];
      setSearchStore('results', newResults);
      setSearchStore('nextPageToken', more.nextpage);
    }
  }

  setSearchStore({
    observer: setObserver(callback),
  });

  updateParam('q', query);
  updateParam('f', searchFilter === 'all' ? '' : searchFilter);

  setSearchStore('isLoading', false);
}

function setObserver(callback: () => Promise<void>): IntersectionObserver {
  const { results, nextPageToken } = searchStore;
  const { searchFilter } = config;

  const useInvidious = searchFilter === 'views' || searchFilter === 'time'
  if (!useInvidious && nextPageToken === 'null') return { disconnect() { } } as IntersectionObserver;
  const { length } = results;
  const index = length > 5 ? 5 : 1;
  const ref = document.querySelector(`.searchlist a:nth-last-child(${index})`) as HTMLElement;
  if (!ref) return { disconnect() { } } as IntersectionObserver;
  const obs = new IntersectionObserver(async (entries, observer) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        observer.disconnect();
        await callback();
        if (useInvidious || searchStore.nextPageToken !== 'null') {
          setSearchStore('observer', setObserver(callback));
        }
      }
    }
  });
  obs.observe(ref);

  return obs;
}