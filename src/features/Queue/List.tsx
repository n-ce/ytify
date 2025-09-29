import { For } from "solid-js";
import { queueStore } from "@lib/stores/queue";
import StreamItem from "@components/StreamItem";

export default function() {
  return (
    <div
      id="queuelist"
    >

      <For each={queueStore.list}>
        {(item) =>
        (
          <StreamItem
            id={item.id}
            title={item.title}
            author={item.author}
            duration={item.duration}
            channelUrl={item.channelUrl}
            lastUpdated={item.lastUpdated}
            draggable={true}
          />
        )
        }

      </For>
    </div>
  )
}
