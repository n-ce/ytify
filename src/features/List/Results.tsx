import { Accessor, For, Show } from "solid-js";
import { listStore } from "../../lib/stores";
import StreamItem from "../../components/StreamItem";

export default function Results(_: {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void),
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
      <div id="listContainer" ref={_.ref}>
        <For each={listStore.list}>{
          (item) =>
            <StreamItem
              id={item.id || ''}
              author={item.author}
              title={item.title || ''}
              duration={item.duration || ''}
              channelUrl={item.channelUrl}
              lastUpdated={item.lastUpdated}
              draggable={_.draggable}
              context={listStore.type}
              mark={_.mark}
            />
        }
        </For>
      </div>
    </Show>
  );
}
