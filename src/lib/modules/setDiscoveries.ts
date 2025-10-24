import { playerStore } from "@lib/stores";
import { convertSStoHHMMSS, getCollection } from "@lib/utils";
import { getHub, updateHub } from "./hub";

export default function(
  id: string,
  relatedStreams: StreamItem[]
) {
  if (id !== playerStore.stream.id) return;

  const hub = getHub();

  if (!hub.discovery)
    hub.discovery = [];


  relatedStreams?.forEach(
    stream => {
      if (
        stream.type !== 'stream' ||
        stream.duration < 100 || stream.duration > 3000) return;

      const rsId = stream.url.slice(9);

      const existingItem = hub.discovery!.find(item => item.id === rsId);

      if (existingItem) {
        existingItem.frequency++;
      } else {
        hub.discovery!.push({
          id: rsId,
          title: stream.title,
          author: stream.uploaderName,
          duration: convertSStoHHMMSS(stream.duration),
          authorId: stream.uploaderUrl.slice(9),
          frequency: 1
        });
      }
    });

  // Randomize Array
  for (let i = hub.discovery!.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hub.discovery![i], hub.discovery![j]] = [hub.discovery![j], hub.discovery![i]];
  }

  // remove if exists in history
  const history = getCollection('history');
  hub.discovery = hub.discovery!.filter(e => !history.includes(e.id));

  // randomly remove items from array when limit crossed
  let len = hub.discovery.length;
  while (len > 256) {
    const i = Math.floor(Math.random() * len)
    hub.discovery.splice(i, 1);
    len--;
  }

  // insert the upgraded collection to discover;
  updateHub(hub);

}
