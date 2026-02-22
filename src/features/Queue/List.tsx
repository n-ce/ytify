import { For, Show, lazy } from "solid-js";
import { queueStore, setQueueStore } from "@stores";
import StreamItem from "@components/StreamItem";
import { config } from "@utils";

const Sortable = lazy(() => import("solid-sortablejs"));

export default function() {
  return (
    <div id="queuelist">
      <Show when={config.manualOrdering} fallback={
        <For each={queueStore.list}>
          {(item) => (
            <StreamItem
              id={item.id}
              title={item.title}
              author={item.author}
              duration={item.duration}
              authorId={item.authorId}
              type="video"
              draggable={false}
              removeMode={queueStore.removeMode}
              context={item.context}
              inQueue={true}
            />
          )}
        </For>
      }>
        <Sortable
          items={queueStore.list}
          setItems={(items: TrackItem[]) => setQueueStore('list', items)}
          idField="id"
          animation={150}
          handle=".ri-draggable"
        >
          {(item: TrackItem) => (
            <StreamItem
              id={item.id}
              title={item.title}
              author={item.author}
              duration={item.duration}
              authorId={item.authorId}
              type="video"
              draggable={true}
              removeMode={queueStore.removeMode}
              context={item.context}
              inQueue={true}
            />
          )}
        </Sortable>
      </Show>
    </div>
  )
}
