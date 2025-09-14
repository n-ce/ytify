import { For, Show } from "solid-js";
import { listStore } from "../../lib/stores";
import StreamItem from "../../components/StreamItem";

export default function ListResults() {

  return (
    <Show
      when={!listStore.isLoading}
      fallback={<i class="ri-loader-3-line"></i>}
    >
      <div id="listContainer">
        <For each={listStore.list}>{
          (item) =>
            <StreamItem
              id={item.id || ''}
              author={item.author}
              title={item.title || ''}
              duration={item.duration || ''}
              channelUrl={item.channelUrl}
              lastUpdated={item.lastUpdated}
              draggable={listStore.isSortable}
              context={listStore.type}
            />
        }
        </For>
      </div>
    </Show>
  );
}
