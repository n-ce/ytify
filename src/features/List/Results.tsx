import { Accessor, For, Show } from "solid-js";
import { listStore } from "@lib/stores";
import StreamItem from "@components/StreamItem";

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
        </For>
      </div>
    </Show>
  );
}
