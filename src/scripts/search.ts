import { pipedInstances, suggestions, suggestionsSwitch, superInput } from "../lib/dom";
import player from "../lib/player";
import { getSaved, save, itemsLoader, idFromURL, params } from "../lib/utils";


const searchlist = <HTMLDivElement>document.getElementById('searchlist');
const searchFilters = <HTMLSelectElement>document.getElementById('searchFilters');
const sortSwitch = <HTMLElement>document.getElementById('sortByTime');
const loadMoreBtn = <HTMLButtonElement>document.getElementById('loadMore');

let token = '';

const loadMoreResults = async (api = 0) =>
  fetch(
    `${pipedInstances.options[api].value}/nextpage/search?nextpage=${encodeURIComponent(token)}&q=${superInput.value}&filter=${searchFilters.value}`
  )
    .then(res => res.json())
    .catch(_ => {
      if (pipedInstances.length === api)
        return alert(_);
      loadMoreResults(api + 1);
    });


loadMoreBtn.addEventListener('click', async () => {
  if (!token) return;
  loadMoreBtn.style.display = 'none';
  const data = await loadMoreResults();
  token = data.nextpage;
  searchlist.appendChild(itemsLoader(data.items));
  loadMoreBtn.style.display = 'block';
});



// Get search results of input

const searchLoader = () => {
  const text = superInput.value;

  if (!text) return;

  searchlist.innerHTML = '';

  loadMoreBtn.style.display = 'none';

  fetch(pipedInstances.value + '/search?q=' + text + '&filter=' + searchFilters.value)
    .then(res => res.json())
    .then(async searchResults => {
      token = searchResults.nextpage;

      if (sortSwitch.hasAttribute('checked')) {
        for (let i = 0; i < 3; i++) {
          const data = await loadMoreResults();
          token = data.nextpage;
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
    })
    .finally(() => loadMoreBtn.style.display = 'block');

  const searchQuery = '?q=' + superInput.value;
  const filterQuery = searchFilters.value === 'all' ? '' : '&f=' + searchFilters.value;
  superInput.dataset.query = searchQuery + filterQuery;

  history.replaceState({}, '', location.origin + location.pathname + superInput.dataset.query);
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
    const li = document.createElement('li');
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


