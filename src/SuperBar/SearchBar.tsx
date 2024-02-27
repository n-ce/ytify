import { For, createSignal } from "solid-js";

const api = 'https://pipedapi.kavin.rocks/';
function search() {
  fetch(api + 'search?q=test&filter=all')
    .then(res => res.json())
    .then(data => console.log(data.items))
}


export default function SearchBar() {

  const [suggestionsList, setSuggestionsList] = createSignal([]);

  function suggestions(e: Event) {
    const input = (e.target as HTMLInputElement);
    const query = input.value;
    if (!query) {
      setSuggestionsList([]);
      return;
    }

    fetch(api + 'suggestions/?query=' + query)
      .then(res => res.json())
      .then(data => setSuggestionsList(data))
  }

  return (
    <div id="SearchBar">
      <ul id="suggestions">
        <For each={suggestionsList()}>
          {item => (<li>{item}</li>)}
        </For>
      </ul>
      <input
        type="search"
        id="superInput"
        autocomplete="off"
        placeholder='Search or enter YT URL'
        oninput={suggestions}
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
      <button aria-label="search button" class="ri-search-2-line" onclick={search}></button>
    </div>
  )
}
