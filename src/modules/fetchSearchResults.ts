import { render } from "uhtml";
import { searchlist } from "../lib/dom";
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
      results = items.filter(
        (item: StreamItem) => (item.lengthSeconds > 62) && (item.viewCount > 1000)
      );
      render(searchlist, ItemsLoader(results));
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
    results =
      items?.filter((item: StreamItem) => !item.isShort);

    render(searchlist, ItemsLoader(results));
    // load more results when 3rd last element is visible
    if (nextPageToken !== 'null')
      setObserver(async () => {
        const data = await loadMoreResults(API, nextPageToken, query.substring(7));
        results = results.concat(data.items?.filter((item: StreamItem) => !item.isShort && item.duration !== -1));
        render(searchlist, ItemsLoader(
          results));
        return data.nextpage;
      });
  })

