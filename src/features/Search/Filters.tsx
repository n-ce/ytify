import { getSearchResults, searchStore, setSearchStore, updateParam, t } from "@lib/stores";
import { config, setConfig } from "@lib/utils";

export default function() {

  return (
    <select
      class="searchFilters"
      onchange={(e) => {
        const { value } = e.target;
        searchStore.observer.disconnect();
        setSearchStore({
          page: 1,
          results: [],
        });
        setConfig('searchFilter', value);
        updateParam('f', value);

        getSearchResults();

      }}
      value={config.searchFilter}
    >
      <option value="all">{t('search_filter_all')}</option>
      <option value="song">{t('search_filter_music_songs')}</option>
      <option value="album">{t('search_filter_music_albums')}</option>
      <option value="relevance">{t('search_filter_videos')}</option>
      <option value="upload_date">{t('search_filter_date')}</option>
      <option value="view_count">{t('search_filter_views')}</option>
      <option value="playlist">{t('search_filter_playlists')}</option>
      <option value="channel">{t('search_filter_channels')}</option>
      <option value="artist">{t('search_filter_music_artists')}</option>
    </select>
  );
}
