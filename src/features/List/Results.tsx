import { Accessor, For, Show } from "solid-js";
import { listStore } from "../../lib/stores";
import StreamItem from "../../components/StreamItem";

export default function ListResults(props: {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void),
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
      <div id="listContainer" ref={props.ref}>
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
              mark={props.mark}
            />
        }
        </For>
      </div>
    </Show>
  );
}
