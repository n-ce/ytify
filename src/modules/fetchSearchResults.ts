import { render } from "uhtml";
import { searchFilters, searchlist } from "../lib/dom";
import { getApi } from "../lib/utils";
import ItemsLoader from "../components/ItemsLoader";

export const getSearchResults = (
  query: string,
  sortBy: string = ''
) =>
  (sortBy === 'date' || sortBy === 'views') ?
    fetchWithInvidious(getApi('invidious'), query, sortBy) :
    fetchWithPiped(getApi('piped'), query);


let nextPageToken = '';
let previousQuery: string;
let page: number = 1;
let results: StreamItem[] = [];
let currentObserver: IntersectionObserver;

function setObserver(callback: () => Promise<string | void>) {
  const items = searchlist.childElementCount;
  const obs = new IntersectionObserver((entries, observer) => entries.forEach(async e => {
    if (e.isIntersecting) {
      observer.disconnect();
      nextPageToken = await callback() || 'null';
      if (nextPageToken !== 'null')
        setObserver(callback);
    }
  }))
  obs.observe(searchlist.children[items - (items > 5 ? 5 : 1)]);

  return obs;
}



function resolvePage(q: string) {
  page = q === previousQuery ?
    page + 1 : 1;
  return page;
}

export const fetchWithInvidious = (
  API: string,
  q: string,
  sortBy: string
) =>
  fetch(`${API}/api/v1/search?q=${q}&sort=${sortBy}&page=${resolvePage(q)}`)
    .then(res => res.json())
    .then(items => {
      if (!items || !items.length)
        throw new Error("No Items Found");

      (items as StreamItem[])
        .filter(
          (item) => (item.lengthSeconds > 62) && (item.viewCount > 1000))
        .forEach((i) => {
          if (results.find((v) => v.videoId === i.videoId) === undefined)
            results.push(i);
        });

      render(searchlist, ItemsLoader(results));
      previousQuery = q;
      currentObserver = setObserver(() => fetchWithInvidious(API, q, sortBy));
    })



const loadMoreResults = (
  API: string,
  token: string,
  query: string
) =>
  fetch(`${API}/nextpage/search?nextpage=${encodeURIComponent(token)}&${query}`)
    .then(res => res.json())
    .catch(x => console.log('e:' + x))

const fetchWithPiped = (
  API: string,
  query: string
) => fetch(API + '/' + query)
  .then(res => res.json())
  .then(async (searchResults) => {
    const items = searchResults.items;
    nextPageToken = searchResults.nextpage;
    if (!items || !items.length)
      throw new Error("No Items Found");

    // filter out shorts
    results =
      items?.filter((item: StreamItem) => !item.isShort);

    if (searchFilters.value === 'music_songs')
        results = items.map(
          (item: StreamItem) => {
            if (!item.uploaderName.endsWith(' - Topic'))
              item.uploaderName += ' - Topic';
            return item;
          }
        );
    
    if (currentObserver)
      currentObserver.disconnect();

    render(searchlist, ItemsLoader(results));
    // load more results when 3rd last element is visible
    if (nextPageToken !== 'null')
      currentObserver = setObserver(async () => {
        const data = await loadMoreResults(API, nextPageToken, query.substring(7));
        (data.items as StreamItem[])
          .filter((item) => !item.isShort && item.duration !== -1)
          .forEach((i) => {
            if (searchFilters.value === 'music_songs')
              if(!i.uploaderName.endsWith(' - Topic'))
                i.uploaderName += ' - Topic';
                  
            if (results.find((v) => v.url === i.url) === undefined)
              results.push(i);
          });

        render(searchlist, ItemsLoader(results));
        return data.nextpage;
      });
  })

searchFilters.addEventListener('change', () => {

  if (currentObserver)
    currentObserver.disconnect();
  page = 1;
  results.length = 0;
});

