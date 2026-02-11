import { For, Show } from 'solid-js';
import { searchStore } from '@lib/stores';
import ListItem from '@components/ListItem';
import StreamItem from '@components/StreamItem';


function isStreamItem(item: YTStreamItem | YTListItem): item is YTStreamItem {
  return item.type === 'stream' || item.type === 'video';
}

export default function SearchResults() {
  return (
    <div class="searchlist">
      <Show when={searchStore.isLoading}>
        <i class="ri-loader-3-line"></i>
      </Show>
      <For each={searchStore.results}>
        {(item) => (
          <Show when={isStreamItem(item)} fallback={<ListItem {...item as YTListItem} />}>
            <StreamItem
              {...item as YTStreamItem}
              context={{
                src: 'search',
                id: searchStore.query
              }}
            />
          </Show>
        )}
      </For>
    </div>
  );
}
