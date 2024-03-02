import { useNavigate } from "@solidjs/router";
import { For, Setter, createSignal } from "solid-js";

const api = 'https://pipedapi.r4fo.com/';

export default function SearchBar({ setSearchResults }: { setSearchResults: Setter<never[]> }) {

  let inputElement!: HTMLInputElement;
  let filters!: HTMLSelectElement;
  let suggestions!: HTMLUListElement;

  const [suggestionsList, setSuggestionsList] = createSignal([]);
  const navigateTo = useNavigate();
  const sortByTime = filters?.selectedIndex === 1;
  const getSearchResults = () =>
    fetch(api + 'search?q=' + inputElement.value + '&filter=' + filters.value)
      .then(res => res.json())
      .then(data => {
        if (!sortByTime)
          setSearchResults(data.items);
        navigateTo('/search');
      });


  let index: number = 0;

  function handleKeys(e: KeyboardEvent) {
    if (e.key === 'Enter') getSearchResults();
    if (e.key === 'Backspace' ||
      !suggestions.hasChildNodes()
    ) return;

    suggestions.querySelectorAll('li.hover')
      .forEach(node =>
        node.classList.remove('hover')
      );

    if (e.key === 'ArrowUp') {
      if (index === 0) index = suggestions.childElementCount;
      index--;
      const li = suggestions.querySelectorAll('li')[index];
      inputElement.value = li.textContent as string;
      li.classList.add('hover');
      li.scrollIntoView();
    }

    if (e.key === 'ArrowDown') {
      const li = suggestions.querySelectorAll('li')[index];
      inputElement.value = li.textContent as string;
      li.classList.add('hover');
      li.scrollIntoView();
      index++;
      if (index === suggestions.childElementCount) index = 0;
    }
  }

  function getSuggestions() {
    const query = inputElement.value;
    query ?
      fetch(api + 'suggestions/?query=' + query)
        .then(res => res.json())
        .then(data => setSuggestionsList(data)) :
      setSuggestionsList([]);
  }

  return (
    <div id="SearchBar">
      <ul
        ref={suggestions}
        id="suggestions"
        style={"display:" + (suggestionsList().length ? 'block' : 'none')
        }>
        <For each={suggestionsList()}>
          {item => (<li>{item}</li>)}
        </For>
      </ul>
      <input
        ref={inputElement}
        type="search"
        id="superInput"
        autocomplete="off"
        placeholder='Search or enter YT URL'
        oninput={getSuggestions}
        onKeyDown={handleKeys}
      />
      <select
        ref={filters}
        id="searchFilters"
        onchange={getSearchResults}
      >
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
      <button
        aria-label="search button"
        class="ri-search-2-line"
        onclick={getSearchResults}
      ></button>
    </div>
  )
}

