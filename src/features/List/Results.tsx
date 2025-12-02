import { Accessor, For, Show } from "solid-js";
import { listStore } from "@lib/stores";
import StreamItem from "@components/StreamItem";

// Type guard to check if an item is a YTStreamItem
function isYTStreamItem(item: CollectionItem | YTStreamItem): item is YTStreamItem {
  return (item as YTStreamItem).type === 'video' || (item as YTStreamItem).type === 'stream';
}

export default function Results(_: {
  draggable: boolean,
  mark?: {
    mode: Accessor<boolean>,
    set: (id: string) => void,
    get: (id: string) => boolean
  }
}) {

  return (
    <Show
      when={!listStore.isLoading}
      fallback={<i class="ri-loader-3-line"></i>}
    >
      <div class="listContainer">
        <For each={listStore.list}>{
          (item) =>
            <Show
              when={isYTStreamItem(item)}
              fallback={
                <StreamItem
                  id={item.id || ''}
                  author={item.author}
                  title={item.title || ''}
                  duration={item.duration || ''}
                  authorId={item.authorId}
                  draggable={_.draggable}
                  context={
                    { id: listStore.name || listStore.id, src: listStore.type }
                  }
                  mark={_.mark}
                />
              }
            >
              <StreamItem
                {...(item as YTStreamItem)}
                draggable={_.draggable}
                context={
                  { id: listStore.name || listStore.id, src: listStore.type }
                }
                mark={_.mark}
              />
            </Show>
        }
        </For>
      </div>
    </Show>
  );
}
