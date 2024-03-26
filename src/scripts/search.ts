import { loadingScreen, pipedInstances, searchFilters, superInput } from "../lib/dom";
import player from "../lib/player";
import { $, getSaved, save, itemsLoader, idFromURL, params, notify, removeSaved, superClick } from "../lib/utils";

const searchlist = <HTMLDivElement>document.getElementById('searchlist');
const searchIcon = <HTMLButtonElement>searchFilters.nextElementSibling;
const suggestions = <HTMLUListElement>document.getElementById('suggestions');
const suggestionsSwitch = <HTMLSelectElement>document.getElementById('suggestionsSwitch');



let nextPageToken = '';

const loadMoreResults = (token: string, query: string) =>
  fetch(`${pipedInstances.value}/nextpage/search?nextpage=${encodeURIComponent(token)}&${query}`)
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
  const text = superInput.value;

  if (!text) {
    searchlist.innerHTML = '';
    insertYtmPls();
    return;
  }

  loadingScreen.showModal();

  searchlist.innerHTML = '';

  const searchQuery = '?q=' + superInput.value;
  const filterQuery = '&filter=' + searchFilters.value;
  const query = 'search' + searchQuery + filterQuery;
  const sortByTime = searchFilters.selectedIndex === 1;

  superInput.dataset.query = searchQuery + (filterQuery.includes('all') ? '' : filterQuery);


  fetch(pipedInstances.value + '/' + query)
    .then(res => res.json())
    .then(async (searchResults) => {
      let items = searchResults.items;
      nextPageToken = searchResults.nextpage;
      if (!items) throw new Error('Search couldn\'t be resolved on ' + pipedInstances.value);

      if (sortByTime && nextPageToken) {
        for (let i = 0; i < 3; i++) {
          const data = await loadMoreResults(nextPageToken, query.substring(7));
          if (!data)
            throw new Error('nextpage error');

          nextPageToken = data.nextpage;
          items = items.concat(data.items);
        }

        type u = StreamItem & {
          uploaded: number
        }
        items = (<u[]>items)
          .filter(i => i.type === 'stream')
          .sort((a, b) => b.uploaded - a.uploaded);

        const uniqueSet = new Set(items);
        items = Array.from(uniqueSet);

        // Deduplication algorithm taken from https://www.techiediaries.com/find-duplicate-objects-in-array-angular

        items = items.reduce((acc: any, item: any) => {
          if (!acc.some((obj: any) => obj.uploaded === item.uploaded))
            acc.push(item);
          return acc;
        }, []);

      }

      // filter livestreams & shorts & append rest
      searchlist.appendChild(
        itemsLoader(
          items.filter((item: StreamItem) => !item.isShort && item.duration !== -1)
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
      const i = pipedInstances.selectedIndex;
      if (i < pipedInstances.length - 1) {
        notify('search error :  switching instance from ' +
          pipedInstances.options[i].value
          + ' to ' +
          pipedInstances.options[i + 1].value
          + ' due to error ' + err.message
        );
        pipedInstances.selectedIndex = i + 1;
        searchLoader();
        return;
      }
      notify(err.message);
      pipedInstances.selectedIndex = 0;
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
  if (_.key === 'Enter') return searchLoader();
  if (_.key === 'Backspace' ||
    !suggestions.hasChildNodes() ||
    getSaved('search_suggestions')) return;

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



searchlist.addEventListener('click', superClick);

searchFilters.addEventListener('change', searchLoader);

searchIcon.addEventListener('click', searchLoader);

suggestionsSwitch.addEventListener('click', () => {
  getSaved('searchSuggestions') ?
    removeSaved('searchSuggestions') :
    save('searchSuggestions', 'off');
  suggestions.style.display = 'none';

});

if (getSaved('searchSuggestions'))
  suggestionsSwitch.removeAttribute('checked')


// search param /?q=

if (params.has('q')) {
  superInput.value = params.get('q') || '';
  if (params.has('f'))
    searchFilters.value = params.get('f') || '';
  searchLoader();
}

// YouTube Music Featured Playlists

function insertYtmPls() {
  fetch('https://raw.githubusercontent.com/wiki/n-ce/ytify/ytm_pls.md')
    .then(res => res.text())
    .then(text => text.split('\n'))
    .then(data => {
      const array = [];
      for (let i = 0; i < data.length; i += 4)
        array.push({
          "type": "playlist",
          "name": data[i + 1],
          "uploaderName": "YouTube Music",
          "url": '/playlists/' + data[i + 2],
          "thumbnail": '/' + data[i + 3]
        });

      searchlist.appendChild(itemsLoader(<StreamItem[]>array));
    });

}

params.has('q') ?
  (searchlist.innerHTML = '') :
  insertYtmPls();
