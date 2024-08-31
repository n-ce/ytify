import { searchlist } from "../lib/dom";
import { itemsLoader } from "../lib/utils";

export const getSearchResults = (
  API: string,
  query: string,
  sortBy: string = ''
) =>
  (sortBy === 'date' || sortBy === 'views') ?
    fetchWithInvidious(API, query, sortBy) :
    fetchWithPiped(API, query);

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
      searchlist.appendChild(
        itemsLoader(
          items.filter(
            (item: StreamItem) => (item.lengthSeconds > 60) && (item.viewCount > 1000)
          )));
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
    if (!items) throw new Error("No Items Found");

    // filter out shorts
    searchlist.appendChild(itemsLoader(
      items?.filter((item: StreamItem) => !item.isShort)
    ));
    // load more results when 3rd last element is visible
    if (nextPageToken !== 'null')
      setObserver(async () => {
        const data = await loadMoreResults(API, nextPageToken, query.substring(7));
        searchlist.appendChild(itemsLoader(
          data.items?.filter((item: StreamItem) => !item.isShort && item.duration !== -1)
        ));
        return data.nextpage;
      });
  })

