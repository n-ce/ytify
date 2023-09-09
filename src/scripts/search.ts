export default function search(pipedInstances: HTMLSelectElement, streamsLoader: any, getSaved: any) {

  const superInput = <HTMLInputElement>document.getElementById('superInput');
  const searchlist = document.getElementById('searchlist');
  const searchFilters = <HTMLSelectElement>document.getElementById('searchFilters');
  const suggestions = <HTMLUListElement>document.getElementById('suggestions');

  // Get search results of input

  const searchLoader = () => {
    if (!superInput.value || !superInput || !searchlist || !searchFilters) return;

    searchlist.innerHTML = '';

    fetch(pipedInstances.value + '/search?q=' + superInput.value + '&filter=' + searchFilters.value)
      .then(res => res.json())
      .then(searchResults => searchResults.items)
      .then(items => streamsLoader(items))
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


  const params = (new URL(location.href)).searchParams;
  const query = params.get('q');
  if (query) {
    superInput.value = query;
    searchLoader();
  }

}