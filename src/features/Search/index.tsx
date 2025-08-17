import { For, onMount, Show } from "solid-js";
import './Search.css';
import StreamItem from "../../components/StreamItem";
import Input from "./Input";
import { config, convertSStoHHMMSS, getThumbIdFromLink, hostResolver, setConfig } from "../../lib/utils";
import { getSearchResults, goto, searchStore, setSearchStore, t } from '../../lib/stores';

const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

export default function(_: {
  close: () => void,
}) {
  let searchSection!: HTMLDivElement;

  onMount(() => {
    goto(searchSection);
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
          onclick={_.close}
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
          <optgroup label={('search_filter_sort_by')}>
            <option value="date">{t('search_filter_date')}</option>
            <option value="views">{t('search_filter_views')}</option>
          </optgroup>
        </select>

      </form>

      <div class="searchlist">
        <Show
          when={!searchStore.isLoading}
          fallback={
            <i class="ri-loader-3-line"></i>}
        >


          <For each={searchStore.results}>
            {(item) => (
              <StreamItem
                id={item.videoId || item.url.substring(9)}
                href={hostResolver(item.url || ('/watch?v=' + item.videoId))}
                title={item.title}
                author={(item.uploaderName || item.author) + (location.search.endsWith('music_songs') ? ' - Topic' : '')}
                duration={(item.duration || item.lengthSeconds) > 0 ? convertSStoHHMMSS(item.duration || item.lengthSeconds) : 'LIVE'}
                uploaded={item.uploadedDate || item.publishedText}
                channelUrl={item.uploaderUrl || item.authorUrl}
                views={item.viewCountText || (item.views > 0 ? numFormatter(item.views) + ' views' : '')}
                img={getThumbIdFromLink(item.thumbnail || 'https://i.ytimg.com/vi_webp/' + item.videoId + '/mqdefault.webp?host=i.ytimg.com')}
              />
            )}
          </For>

        </Show>
      </div>
    </section>
  );
}
