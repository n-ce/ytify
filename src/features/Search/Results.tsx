import { For, Show, Switch, Match } from 'solid-js';
import { searchStore } from '../../lib/stores';
import ListItem from '../../components/ListItem';
import StreamItem from '../../components/StreamItem';
import { convertSStoHHMMSS, getThumbIdFromLink, hostResolver } from '../../lib/utils';

const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

export default function SearchResults() {
  return (
    <div class="searchlist">
      <Show when={searchStore.isLoading}>
        <i class="ri-loader-3-line"></i>
      </Show>
      <Show when={!searchStore.results.length && !searchStore.isLoading}>
        It's rather empty here isn't it?
      </Show>
      <For each={searchStore.results}>
        {(item) => (
          <Switch>
            <Match when={item.type === 'stream'}>
              <StreamItem
                id={item.videoId || item.url.substring(9)}
                href={hostResolver(item.url || ('/watch?v=' + item.videoId))}
                channelUrl={item.uploaderUrl || item.authorUrl}
                title={item.title}
                author={item.uploaderName || item.author}
                duration={(item.duration || item.lengthSeconds) > 0 ? convertSStoHHMMSS(item.duration || item.lengthSeconds) : 'LIVE'}
                views={item.viewCountText || (item.views > 0 ? numFormatter(item.views) + ' views' : '')}
                uploaded={item.uploadedDate || item.publishedText}
                img={getThumbIdFromLink(item.thumbnail || 'https://i.ytimg.com/vi_webp/' + item.videoId + '/mqdefault.webp?host=i.ytimg.com')}
              />
            </Match>
            <Match when={item.type === 'channel'}>
              <ListItem
                title={item.name}
                stats={''}
                thumbnail={item.thumbnail}
                uploader_data={item.description}
                url={item.url}
              />
            </Match>
            <Match when={item.type === 'playlist'}>
              <ListItem
                title={item.name}
                stats={item.videos + ' streams'}
                thumbnail={item.thumbnail}
                uploader_data={item.uploaderName}
                url={item.url}
              />
            </Match>
          </Switch>
        )}
      </For>
    </div>
  );
}
