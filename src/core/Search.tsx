import { onMount } from "solid-js";
import './search.css';
import { i18n } from "../lib/utils";

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
        <p>{i18n('nav_search')}</p>
        <i class="ri-close-large-line" onclick={_.close}></i>
      </header>
      <form id="superInputContainer">
        <input
          placeholder={i18n("search_placeholder")}
          type="search"
          id="superInput"
          ref={superInput}
          autocomplete="off" />
        <select id="searchFilters">
          <optgroup label="YouTube">
            <option value="all">{i18n('search_filter_all')}</option>
            <option value="videos">{i18n('search_filter_videos')}</option>
            <option value="channels">{i18n('search_filter_channels')}</option>
            <option value="playlists">{i18n('search_filter_playlists')}</option>
          </optgroup>
          <optgroup label="YouTube Music">
            <option value="music_songs">{i18n('search_filter_music_songs')}</option>
            <option value="music_artists">{i18n('search_filter_music_artists')}</option>
            <option value="music_videos">{i18n('search_filter_music_videos')}</option>
            <option value="music_albums">{i18n('search_filter_music_albums')}</option>
            <option value="music_playlists">{i18n('search_filter_music_playlists')}</option>
          </optgroup>
          <optgroup label={i18n('search_filter_sort_by')}>
            <option value="date">{i18n('search_filter_date')}</option>
            <option value="views">{i18n('search_filter_views')}</option>
          </optgroup>
        </select>
      </form>
      <ul id="suggestions">
        <li>test</li>
        <li>test</li>
        <li>test</li>
        <li>test</li>
        <li>test</li>
        <li>test</li>
        <li>test</li>
        <li>test</li>
        <li>test</li>
        <li>test</li>
      </ul>
      <div id="searchlist">
      </div>
    </section>
  );
}
