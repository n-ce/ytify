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
      <optgroup label={t('search_filter_youtube')}>
        <option value="all">{t('search_filter_all')}</option>
        <option value="video_relevance">{t('search_filter_videos')}</option>
        <option value="video_date">{t('search_filter_date')}</option>
        <option value="video_views">{t('search_filter_views')}</option>
        <option value="channel">{t('search_filter_channels')}</option>
        <option value="playlist">{t('search_filter_playlists')}</option>
      </optgroup>
      <optgroup label={t('search_filter_youtube_music')}>
        <option value="music_songs">{t('search_filter_music_songs')}</option>
        <option value="music_artists">{t('search_filter_music_artists')}</option>
        <option value="music_videos">{t('search_filter_music_videos')}</option>
        <option value="music_albums">{t('search_filter_music_albums')}</option>
        <option value="music_playlists">{t('search_filter_music_playlists')}</option>
      </optgroup>
    </select>
  );
}
