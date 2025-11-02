import { For, onCleanup, onMount } from "solid-js";
import { queueStore, setQueueStore } from "@lib/stores/queue";
import StreamItem from "@components/StreamItem";
import Sortable, { type SortableEvent } from 'sortablejs';

export default function(props: { removeMode: boolean }) {

  let queuelist!: HTMLDivElement;
  let sortableRef!: Sortable;

  onMount(() => {

    if (queuelist) {
      sortableRef = new Sortable(queuelist, {
        handle: '.ri-draggable',
        onUpdate(e: SortableEvent) {
          if (e.oldIndex == null || e.newIndex == null) return;
          setQueueStore("list", (list) => {
            const newList = [...list];
            const [removed] = newList.splice(e.oldIndex!, 1);
            newList.splice(e.newIndex!, 0, removed);
            return newList;
          });
        }
      });
    }
  });

  onCleanup(() => {
    sortableRef.destroy();
    console.log('sortable destroy');
  })


  return (
    <div
      id="queuelist"
      ref={queuelist}
    >

      <For each={queueStore.list}>
        {(item, i) =>
        (
          <StreamItem
            id={item.id}
            title={item.title}
            author={item.author}
            duration={item.duration}
            authorId={item.authorId}
            draggable={true}
            removeMode={props.removeMode}
            context={{
              src: 'queue',
              id: i().toString()
            }}
          />
        )
        }

      </For>
    </div>
  )
}
