import { pipedInstances, getSaved, save, params } from "./utils";

export default function search(itemsLoader: (items: []) => DocumentFragment) {

  const superInput = <HTMLInputElement>document.getElementById('superInput');
  const searchlist = document.getElementById('searchlist');
  const searchFilters = <HTMLSelectElement>document.getElementById('searchFilters');
  const suggestions = <HTMLUListElement>document.getElementById('suggestions');
  const suggestionsSwitch = document.getElementById('suggestionsSwitch');

  // Get search results of input

  const searchLoader = () => {
    if (!superInput.value || !superInput || !searchlist || !searchFilters) return;

    searchlist.innerHTML = '';

    fetch(pipedInstances.value + '/search?q=' + superInput.value + '&filter=' + searchFilters.value)
      .then(res => res.json())
      .then(searchResults => searchResults.items)
      .then(items => itemsLoader(items))
      .then(fragment => searchlist.appendChild(fragment))
      .catch(err => {
        if (pipedInstances.selectedIndex < pipedInstances.length - 1) {
          pipedInstances.selectedIndex++;
          searchLoader();
          return;
        }
        alert(err)
      });
    suggestions.style.display = 'none';
  }



  // super input supports both searching and direct link, also loads suggestions

  superInput.addEventListener('input', async () => {

    suggestions.innerHTML = '';
    suggestions.style.display = 'none';
    /*
        if (!superInput.value.includes(previous_ID))
          if (validator(superInput.value))
            return;*/

    if (superInput.value.length < 3 || getSaved('search_suggestions')) return;

    suggestions.style.display = 'block';

    const data = await fetch(pipedInstances.value + '/suggestions/?query=' + superInput.value).then(res => res.json());

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
  });


  superInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchLoader();
  });


  searchFilters.nextElementSibling?.addEventListener('click', searchLoader);

  searchFilters.addEventListener('change', searchLoader);

  suggestionsSwitch?.addEventListener('click', () => {
    getSaved('search_suggestions') ?
      localStorage.removeItem('search_suggestions') :
      save('search_suggestions', 'off');
    suggestions.style.display = 'none';

  });
  if (getSaved('search_suggestions') && suggestionsSwitch)
    suggestionsSwitch.removeAttribute('checked')


  const query = params.get('q');
  if (query) {
    superInput.value = query;
    searchFilters.value = 'channels';
    searchLoader();
  }

}