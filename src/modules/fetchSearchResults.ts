import { searchlist } from "../lib/dom";
import { getApi, itemsLoader } from "../lib/utils";

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

function setObserver(callback: () => Promise<string | void>) {

  const items = searchlist.childElementCount;

  new IntersectionObserver((entries, observer) =>
    entries.forEach(async e => {
      if (e.isIntersecting) {
        observer.disconnect();
        nextPageToken = await callback() || 'null';
        if (nextPageToken !== 'null')
          setObserver(callback);
      }
    })).observe(searchlist.children[items - (items > 5 ? 5 : 1)]);
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
      
      itemsLoader(
        items.filter(
          (item: StreamItem) => (item.lengthSeconds > 62) && (item.viewCount > 1000)
        ), searchlist);
      previousQuery = q;
      setObserver(() => fetchWithInvidious(API, q, sortBy));
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
    itemsLoader(
      items?.filter((item: StreamItem) => !item.isShort)
      , searchlist
    );
    // load more results when 3rd last element is visible
    if (nextPageToken !== 'null')
      setObserver(async () => {
        const data = await loadMoreResults(API, nextPageToken, query.substring(7));
        itemsLoader(
          data.items?.filter((item: StreamItem) => !item.isShort && item.duration !== -1)
          , searchlist
        );
        return data.nextpage;
      });
  })

