import { For, onCleanup, onMount } from "solid-js";
import { queueStore, setQueueStore } from "@lib/stores/queue";
import StreamItem from "@components/StreamItem";
import type Sortable from 'sortablejs';
import { type SortableEvent } from 'sortablejs';
import { config } from "@lib/utils";

export default function() {

  let queuelist!: HTMLDivElement;
  let sortableRef!: Sortable;

  onMount(() => {

    if (queuelist && config.manualOrdering) {
      import('sortablejs').then(module => {
        const Sortable = module.default;
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
      });
    }
  });

  onCleanup(() => {
    sortableRef?.destroy();
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
            draggable={config.manualOrdering}
            removeMode={queueStore.removeMode}
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