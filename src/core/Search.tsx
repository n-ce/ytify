import { onMount } from "solid-js";
import './search.css';

export default function(_: {
  close: () => void,
}) {
  let searchSection!: HTMLDivElement;
  let superInput!: HTMLInputElement;
  onMount(() => {
    searchSection.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      superInput.focus();
    }, 500);
  });
  return (
    <section ref={searchSection} id="searchSection">
      <header>
        <p>Search</p>
        <i class="ri-close-large-line" onclick={_.close}></i>

      </header>
      <form id="superInputContainer">
        <input
          placeholder="search_placeholder"
          type="search"
          id="superInput"
          ref={superInput}
          autocomplete="off" />
        <select id="searchFilters">
          <optgroup label="YouTube">
            <option data-translation="search_filter_all" value="all">All</option>
            <option data-translation="search_filter_videos" value="videos">Videos</option>
            <option data-translation="search_filter_channels" value="channels">Channels</option>
            <option data-translation="search_filter_playlists" value="playlists">Playlists</option>
          </optgroup>
          <optgroup label="YouTube Music">
            <option data-translation="search_filter_music_songs" value="music_songs">Songs</option>
            <option data-translation="search_filter_music_artists" value="music_artists">Artists</option>
            <option data-translation="search_filter_music_videos" value="music_videos">Videos</option>
            <option data-translation="search_filter_music_albums" value="music_albums">Albums</option>
            <option data-translation="search_filter_music_playlists" value="music_playlists">Playlists</option>
          </optgroup>
          <optgroup data-translation-label="search_filter_sort_by" label="Sort By">
            <option data-translation="search_filter_date" value="date">Time</option>
            <option data-translation="search_filter_views" value="views">Views</option>
          </optgroup>
        </select>
      </form>
      <ul id="suggestions"></ul>
      <div id="searchlist">
      </div>
    </section>
  );
}
