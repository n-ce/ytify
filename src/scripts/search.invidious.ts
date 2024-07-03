import { searchlist } from "../lib/dom";
import { getApi, itemsLoader } from "../lib/utils";

let page: number;

function setObserver2(callback: () => Promise<void>) {

  const items = searchlist.childElementCount;

  new IntersectionObserver((entries, observer) =>
    entries.forEach(async e => {
      if (e.isIntersecting) {
        observer.disconnect();
        page++;
        await callback();
        setObserver2(callback);
      }
    })).observe(searchlist.children[items - (items > 5 ? 5 : 1)]);
}

export const fetchResultsWithInvidious = (
  q: string,
  sortBy: string
) =>
  fetch(`${getApi('invidious')}/api/v1/search?q=${q}&sort=${sortBy}&page=${page}`)
    .then(res => res.json())
    .then(items => {

      searchlist.appendChild(
        itemsLoader(
          items.filter(
            (item: StreamItem) => (item.lengthSeconds > 60) && (item.viewCount > 1000)
          )));

      setObserver2(() => fetchResultsWithInvidious(q, sortBy));


    });
