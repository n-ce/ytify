import { For, Show } from 'solid-js';
import { searchStore } from '@lib/stores';
import ListItem from '@components/ListItem';
import StreamItem from '@components/StreamItem';



export default function SearchResults() {
  return (
    <div class="searchlist">
      <Show when={searchStore.isLoading}>
        <i class="ri-loader-3-line loading-spinner"></i>
      </Show>
      <For each={searchStore.results}>
        {(item) => (
          <Show
            when={item.type === 'video' || item.type === 'song'}
            fallback={<ListItem {...item as YTListItem}
            />}>
            <StreamItem
              {...item as YTItem}
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
