import { onMount } from "solid-js";
import './Search.css';
import Results from './Results';
import Input from "./Input";
import { config, setConfig } from "../../lib/utils";
import { getSearchResults, openFeature, resetSearch, searchStore, setNavStore, setSearchStore, t } from '../../lib/stores';



export default function() {
  let searchSection!: HTMLDivElement;

  onMount(() => {
    openFeature('search', searchSection);
  });


  return (
    <section
      ref={searchSection}
      class="searchSection"
    >
      <header>
        <p>{t('nav_search')}</p>
        <i
          class="ri-close-large-line"
          onclick={resetSearch}
        ></i>
      </header>
      <form class="superInputContainer">

        <Input />

        <select
          class="searchFilters"
          onchange={(e) => {
            const { value } = e.target as HTMLSelectElement;
            setSearchStore('sortBy', (
              value === 'date' ||
              value === 'views'
            ) ? value : '')
            setConfig('searchFilter', value);
            setNavStore('params', 'f', value);
            if (searchStore.query)
              getSearchResults();

          }}
          value={config.searchFilter || 'all'}
        >
          <optgroup label="YouTube">
            <option value="all">{t('search_filter_all')}</option>
            <option value="videos">{t('search_filter_videos')}</option>
            <option value="channels">{t('search_filter_channels')}</option>
            <option value="playlists">{t('search_filter_playlists')}</option>
          </optgroup>
          <optgroup label="YouTube Music">
            <option value="music_songs">{t('search_filter_music_songs')}</option>
            <option value="music_artists">{t('search_filter_music_artists')}</option>
            <option value="music_videos">{t('search_filter_music_videos')}</option>
            <option value="music_albums">{t('search_filter_music_albums')}</option>
            <option value="music_playlists">{t('search_filter_music_playlists')}</option>
          </optgroup>
          <optgroup label={t('search_filter_sort_by')}>
            <option value="date">{t('search_filter_date')}</option>
            <option value="views">{t('search_filter_views')}</option>
          </optgroup>
        </select>

      </form>
      <Results />
    </section>
  );
}
