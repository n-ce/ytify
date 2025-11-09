
/*
> Get all related streams of a stream
> Check if stream exists in stream history or trash history or queue, if not enqueue it
> sometimes users will remove items from queue manually,
> we need to account for this using the trashHistory array
*/

import { playerStore } from "@lib/stores";
import { setQueueStore } from "@lib/stores/queue";
import { convertSStoHHMMSS } from "@lib/utils";

export default function(data: StreamItem[]) {

  const { history, isMusic } = playerStore;


  data.forEach(stream => {

    const id = stream.url.slice(9);

    if (
      'type' in stream &&
      stream.type === 'stream' &&
      stream.duration > 45 &&
      !(sessionStorage.getItem('trashHistory') || '').includes(id) &&
      !history.some(item => item.id === id) &&
      (!isMusic || stream.uploaderName.endsWith(' - Topic'))
    )
      setQueueStore('list', l => [...l, ({
        id: id,
        title: stream.title,
        author: stream.uploaderName,
        duration: convertSStoHHMMSS(stream.duration)
      }) as CollectionItem])
  });

}
