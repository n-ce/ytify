import { instanceSelector, loadingScreen, searchFilters, superInput } from "../lib/dom";
import player from "../lib/player";
import { $, getSaved, getApi, itemsLoader, idFromURL, params, notify, superClick } from "../lib/utils";
import { fetchSearchResults } from "./search.invidious";


const searchlist = <HTMLDivElement>document.getElementById('searchlist');
const suggestions = <HTMLUListElement>document.getElementById('suggestions');
let nextPageToken = '';

const loadMoreResults = (token: string, query: string) =>
  fetch(`${getApi('piped')}/nextpage/search?nextpage=${encodeURIComponent(token)}&${query}`)
    .then(res => res.json())
    .catch(x => console.log('e:' + x))


function setObserver(callback: () => Promise<string>) {
  new IntersectionObserver((entries, observer) =>
    entries.forEach(async e => {
      if (e.isIntersecting) {
        nextPageToken = await callback();
        observer.disconnect();
        setObserver(callback);
      }
    })).observe(searchlist.children[searchlist.childElementCount - 5]);
}


// Get search results of input
function searchLoader() {

  const searchQuery = '?q=' + superInput.value;
  const filterQuery = '&filter=' + searchFilters.value;
  const query = 'search' + searchQuery + filterQuery;
  const useInvidious = searchFilters.selectedIndex > 7;

  superInput.dataset.query = searchQuery + (filterQuery.includes('all') ? '' : filterQuery);
  searchlist.innerHTML = '';

  if (!superInput.value) {
    history.replaceState({}, '', location.origin + location.pathname);
    return
  }

  loadingScreen.showModal();

  if (useInvidious) {
    fetchSearchResults(superInput.value, searchFilters.value);
    loadingScreen.close();
    return;
  }

  fetch(getApi('piped') + '/' + query)
    .then(res => res.json())
    .then(async (searchResults) => {
      const items = searchResults.items;
      nextPageToken = searchResults.nextpage;
      if (!items) throw new Error('Search couldn\'t be resolved on ' + getApi('piped'));


      // filter out shorts
      searchlist.appendChild(
        itemsLoader(
          items.filter((item: StreamItem) => !item.isShort)
        ));
      // load more results when 3rd last element is visible

      setObserver(async () => {
        const data = await loadMoreResults(nextPageToken, query.substring(7));
        searchlist.appendChild(itemsLoader(
          data.items.filter((item: StreamItem) => !item.isShort && item.duration !== -1)
        ));
        return data.nextpage;
      });
    })
    .catch(err => {
      if (err.message === 'nextpage error') return;
      const i = instanceSelector.selectedIndex;
      if (i < instanceSelector.length - 1) {
        notify(`search error :  switching instance from ${getApi('piped')} to ${getApi('piped', i + 1)} due to error ${err.message}`);
        instanceSelector.selectedIndex++;
        searchLoader();
        return;
      }
      notify(err.message);
      instanceSelector.selectedIndex = 0;
    })
    .finally(() => loadingScreen.close());

  history.replaceState({}, '', location.origin + location.pathname + superInput.dataset.query.replace('filter', 'f'));
  suggestions.style.display = 'none';

}


// super input supports both searching and direct link, also loads suggestions

let prevID: string | undefined;

superInput.addEventListener('input', async () => {

  const text = superInput.value;

  const id = idFromURL(text);
  if (id !== prevID) {
    player(id);
    prevID = id;
    return;
  }
  if (getSaved('search_suggestions')) return;

  suggestions.innerHTML = '';
  suggestions.style.display = 'none';

  if (text.length < 3) return;

  suggestions.style.display = 'block';

  const data = await fetch(getApi('piped') + '/suggestions/?query=' + text).then(res => res.json());

  if (!data.length) return;

  const fragment = document.createDocumentFragment();

  for (const suggestion of data) {
    const li = $('li');
    li.textContent = suggestion;
    li.onclick = () => {
      superInput.value = suggestion;
      searchLoader();
    }
    fragment.appendChild(li);
  }
  suggestions.appendChild(fragment);


  index = 0;

});

let index = 0;

superInput.addEventListener('keydown', _ => {
  if (_.key === 'Enter') {
    searchLoader();
    _.preventDefault();
  }
  if (_.key === 'Backspace' ||
    getSaved('search_suggestions') ||
    !suggestions.hasChildNodes()
  ) return;

  suggestions.childNodes.forEach(node => {
    if ((<HTMLLIElement>node).classList.contains('hover'))
      (<HTMLLIElement>node).classList.remove('hover');
  });

  if (_.key === 'ArrowUp') {
    if (index === 0) index = suggestions.childElementCount;
    index--;
    const li = <HTMLLIElement>suggestions.children[index];
    superInput.value = <string>li.textContent;
    li.classList.add('hover');
  }

  if (_.key === 'ArrowDown') {
    const li = <HTMLLIElement>suggestions.children[index];
    superInput.value = <string>li.textContent;
    li.classList.add('hover');
    index++;
    if (index === suggestions.childElementCount) index = 0;
  }

});

// CTRL + K focus search bar
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === "K")
    superInput.focus();
});

searchlist.addEventListener('click', superClick);

searchFilters.addEventListener('change', searchLoader);

if (getSaved('searchSuggestions'))
  suggestions.remove();

const savedSearchFilter = getSaved('searchFilter');
if (savedSearchFilter)
  searchFilters.value = savedSearchFilter;



// search param /?q=
addEventListener('DOMContentLoaded', () => {
  if (params.has('q')) {
    superInput.value = params.get('q') || '';
    if (params.has('f'))
      searchFilters.value = params.get('f') || '';
    searchLoader();
  }
});

