import { pipedInstances, suggestions, suggestionsSwitch, superInput } from "../lib/dom";
import { getSaved, save, itemsLoader } from "../lib/utils";


const searchlist = <HTMLDivElement>document.getElementById('searchlist');
const searchFilters = <HTMLSelectElement>document.getElementById('searchFilters');
const loadMoreBtn = <HTMLButtonElement>document.getElementById('loadMore');

let token = '';

loadMoreBtn.addEventListener('click', () => {
  if (token)
    fetch(
      `${pipedInstances.value}/nextpage/search?nextpage=${encodeURIComponent(token)}&q=${superInput.value}&filter=${searchFilters.value}`
    )
      .then(res => res.json())
      .then(data => {
        token = data.nextpage;
        searchlist.appendChild(itemsLoader(data.items));
      })
});


// Get search results of input

const searchLoader = () => {
  const text = superInput.value;

  if (!text) return;

  searchlist.innerHTML = '';

  fetch(pipedInstances.value + '/search?q=' + text + '&filter=' + searchFilters.value)
    .then(res => res.json())
    .then(searchResults => {
      token = searchResults.nextpage;
      loadMoreBtn.style.display = 'block';
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
  suggestions.style.display = 'none';
}


// super input supports both searching and direct link, also loads suggestions

superInput.addEventListener('input', async () => {

  const text = superInput.value;

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

superInput.addEventListener('keyup', _ => {
  if (_.key === 'Backspace') return;

  if (_.key === 'Enter') return searchLoader();

  if (!suggestions.hasChildNodes()) return;

  if (_.key === 'ArrowUp') {
    if (index === 0) index = suggestions.childElementCount;
    index--;
  }

  superInput.value = (<HTMLLIElement>suggestions.children[index]).textContent || '';

  if (_.key === 'ArrowDown') {
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


