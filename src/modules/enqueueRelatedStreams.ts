import { store } from "../lib/store";
import { convertSStoHHMMSS } from "../lib/utils";
import { appendToQueuelist } from "../scripts/queue";

/*
>Get all related streams of a stream
>Check if stream exists in stream history or trash history or queue, if not enqueue it
*/

export function enqueueRelatedStreams(data: StreamItem[]) {

  // sometimes users will remove items from queue manually,
  // we need to account for this using the trashHistory array

  data.forEach(stream => {

    const id = stream.url.slice(9);

    if (
      'type' in stream &&
      stream.type === 'stream' &&
      stream.duration > 45 &&
      !(sessionStorage.getItem('trashHistory') || '').includes(id) &&
      !store.streamHistory.includes(id)
    )
      appendToQueuelist({
        id: id,
        title: stream.title,
        author: stream.uploaderName,
        duration: convertSStoHHMMSS(stream.duration),
      })
  });

}
