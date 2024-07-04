import { searchlist } from "../lib/dom";
import { getApi, itemsLoader } from "../lib/utils";


function setObserver(callback: () => Promise<void>) {

  const items = searchlist.childElementCount;

  new IntersectionObserver((entries, observer) =>
    entries.forEach(async e => {
      if (e.isIntersecting) {
        observer.disconnect();
        await callback();
        setObserver(callback);
      }
    })).observe(searchlist.children[items - (items > 5 ? 5 : 1)]);
}

let previousQuery: string;
let page: number = 1;
function resolvePage(q: string) {
  page = q === previousQuery ?
    page + 1 : 1;
  return page;
}

export const fetchResultsWithInvidious = (
  q: string,
  sortBy: string
) =>
  fetch(`${getApi('invidious')}/api/v1/search?q=${q}&sort=${sortBy}&page=${resolvePage(q)}`)
    .then(res => res.json())
    .then(items => {
      searchlist.appendChild(
        itemsLoader(
          items.filter(
            (item: StreamItem) => (item.lengthSeconds > 60) && (item.viewCount > 1000)
          )));
      previousQuery = q;
      setObserver(() => fetchResultsWithInvidious(q, sortBy));
    });
