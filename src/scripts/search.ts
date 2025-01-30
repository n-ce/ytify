import { loadingScreen, searchFilters, searchlist, superInput } from "../lib/dom";
import player from "../lib/player";
import { $, errorHandler, getApi, idFromURL, superClick } from "../lib/utils";
import { store, getSaved } from "../lib/store";
import { getSearchResults } from "../modules/fetchSearchResults";


const suggestions = <HTMLUListElement>document.getElementById('suggestions');

// Get search results of input
function searchLoader() {

  const searchQuery = '?q=' + superInput.value;
  const filterQuery = '&filter=' + searchFilters.value;
  const query = 'search' + searchQuery + filterQuery;
  const useInvidious = searchFilters.selectedIndex > 8;

  store.searchQuery = searchQuery + (filterQuery.includes('all') ? '' : filterQuery);
  searchlist.innerHTML = '';

  if (!superInput.value) {
    history.replaceState({}, '', location.origin + location.pathname);
    return
  }

  loadingScreen.showModal();

  getSearchResults(
    useInvidious ?
      superInput.value : query,
    searchFilters.value
  )
    .catch(err => {
      if (useInvidious && store.api.index >= store.api.invidious.length)
        store.api.index = -1;

      if (err.message === 'nextpage error') return;

      errorHandler(err.message, searchLoader);
    })
    .finally(() => loadingScreen.close());

  history.replaceState({}, '', location.origin + location.pathname + store.searchQuery.replace('filter', 'f'));
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

  const fetchSuggestions = async () => fetch(getApi('piped') + '/opensearch/suggestions/?query=' + text)
    .then(res => res.json())
    .catch(e => errorHandler(e.message, fetchSuggestions));

  const data = (await fetchSuggestions())[1];

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



superInput.addEventListener('blur', () => {
  setTimeout(() => {
    if (suggestions.style.display === 'block')
      suggestions.style.display = 'none';
    suggestions.innerHTML = '';
  }, 500);
})


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



