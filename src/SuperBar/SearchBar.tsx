/*
// Get search results of input
function searchLoader() {
  const text = superInput.value;

  if (!text) return;

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
        const temp: u[] = [];

        for (const item of items)
          if (item.type === 'stream' && !temp.includes(item))
            temp.push(item);
        items = temp.sort((a, b) => b.uploaded - a.uploaded);
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
*/
export default function SearchBar() {
  return (
    <>
      <ul id="suggestions"></ul>
      <div id="SearchBar">
        <input
          type="search"
          id="superInput"
          autocomplete="off"
          placeholder='Search or enter YT URL'

        />
        <select id="searchFilters">
          <optgroup label="YouTube">
            <option value="all">All</option>
            <option value="all">By Time</option>
            <option value="videos">Videos</option>
            <option value="channels">Channels</option>
            <option value="playlists">Playlists</option>
          </optgroup>
          <optgroup label="YouTube Music">
            <option value="music_songs">Songs</option>
            <option value="music_videos">Videos</option>
            <option value="music_albums">Albums</option>
            <option value="music_playlists">Playlists</option>
          </optgroup>
        </select>
        <button aria-label="search button" class="ri-search-2-line"></button>
      </div>
    </>
  )
}
