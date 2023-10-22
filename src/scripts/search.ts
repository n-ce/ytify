import { pipedInstances, suggestions, suggestionsSwitch, superInput } from "../lib/dom";
import player from "../lib/player";
import { $, getSaved, save, itemsLoader, idFromURL, params, loadMoreResults, loadMoreOnScroll } from "../lib/utils";


const searchlist = <HTMLDivElement>document.getElementById('searchlist');
const searchFilters = <HTMLSelectElement>document.getElementById('searchFilters');
const sortSwitch = <HTMLElement>document.getElementById('sortByTime');




// Get search results of input

const searchLoader = () => {
  const text = superInput.value;

  if (!text) return;

  searchlist.innerHTML = '';

  const searchQuery = '?q=' + superInput.value;
  const filterQuery = '&filter=' + searchFilters.value;

  superInput.dataset.query = searchQuery + (filterQuery.includes('all') ? '' : filterQuery);

  const query = 'search' + searchQuery + filterQuery;

  fetch(pipedInstances.value + '/' + query)
    .then(res => res.json())
    .then(async searchResults => {
      searchlist.dataset.token = searchResults.nextpage;
      loadMoreOnScroll(
        <HTMLDivElement>searchlist.parentElement,
        searchlist,
        () => query + '&'
      );
      if (sortSwitch.hasAttribute('checked')) {
        for (let i = 0; i < 3; i++) {
          const data = await loadMoreResults(
            query + '&',
            <string>searchlist.dataset.token
          );
          searchlist.dataset.token = data.nextpage;
          searchResults.items = searchResults.items.concat(data.items);
        }
        searchResults.items.sort((
          a: { uploaded: number },
          b: { uploaded: number }
        ) => b.uploaded - a.uploaded);
      }
      searchlist.appendChild(
        itemsLoader(
          searchResults.items
        )
      )
    })
    .catch(err => {
      if (pipedInstances.selectedIndex < pipedInstances.length - 1) {
        pipedInstances.selectedIndex++;
        searchLoader();
        return;
      }
      alert(err);
      pipedInstances.selectedIndex = 0;
    });

  history.replaceState({}, '', location.origin + location.pathname + superInput.dataset.query.replace('filter', 'f'));
  suggestions.style.display = 'none';
}


sortSwitch.addEventListener('click', searchLoader);


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

  suggestions.innerHTML = '';
  suggestions.style.display = 'none';

  if (text.length < 3 || getSaved('search_suggestions')) return;

  suggestions.style.display = 'block';

  const data = await fetch(pipedInstances.value + '/suggestions/?query=' + text).then(res => res.json());

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
  if (_.key === 'Backspace') return;

  if (_.key === 'Enter') return searchLoader();

  if (!suggestions.hasChildNodes()) return;



  if (_.key === 'ArrowUp') {
    if (index === 0) index = suggestions.childElementCount;
    index--;
    superInput.value = (<HTMLLIElement>suggestions.children[index]).textContent || '';
  }


  if (_.key === 'ArrowDown') {
    superInput.value = (<HTMLLIElement>suggestions.children[index]).textContent || '';
    index++;
    if (index === suggestions.childElementCount) index = 0;
  }

});



(<HTMLButtonElement>searchFilters.nextElementSibling).addEventListener('click', searchLoader);

searchFilters.addEventListener('change', searchLoader);

suggestionsSwitch.addEventListener('click', () => {
  getSaved('search_suggestions') ?
    localStorage.removeItem('search_suggestions') :
    save('search_suggestions', 'off');
  suggestions.style.display = 'none';

});
if (getSaved('search_suggestions') && suggestionsSwitch)
  suggestionsSwitch.removeAttribute('checked')


// search param /?q=

if (params.has('q')) {
  superInput.value = params.get('q') || '';
  if (params.has('f'))
    searchFilters.value = params.get('f') || '';
  searchLoader();
}


