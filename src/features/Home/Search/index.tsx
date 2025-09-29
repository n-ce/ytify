import { onCleanup } from "solid-js";
import './Search.css';
import Results from './Results';
import Input from "./Input";
import { config, setConfig } from "../../../lib/utils";
import { getSearchResults, resetSearch, searchStore, setSearchStore, t, updateParam } from '../../../lib/stores';



export default function() {


  onCleanup(resetSearch);


  return (
    <div class="search">
      <form class="superInputContainer">

        <Input />

        <select
          class="searchFilters"
          onchange={(e) => {
            const { value } = e.target;
            searchStore.observer.disconnect();
            setSearchStore({
              page: 1,
              nextPageToken: '',
              results: [],
            });
            setConfig('searchFilter', value);
            updateParam('f', value);

            getSearchResults();

          }}
          value={config.searchFilter}
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
    </div>
  );
}
