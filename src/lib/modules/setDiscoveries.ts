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
    hub.discovery = {};


  relatedStreams?.forEach(
    stream => {
      if (
        stream.type !== 'stream' ||
        stream.duration < 100 || stream.duration > 3000) return;

      const rsId = stream.url.slice(9);

      // merges previous discover items with current related streams
      if (!hub.discovery) return;

      hub.discovery?.hasOwnProperty(rsId) ?
        (hub.discovery[rsId].frequency)++ :
        hub.discovery[rsId] = {

          id: rsId,
          title: stream.title,
          author: stream.uploaderName,
          duration: convertSStoHHMMSS(stream.duration),
          authorId: stream.uploaderUrl.slice(9),
          frequency: 1
        }
    });

  // convert to array
  let array = Object.entries(hub.discovery!);

  // Randomize Array
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  // remove if exists in history
  const history = getCollection('history');
  array = array.filter(e => history.includes(e[0]));

  // randomly remove items from array when limit crossed
  let len = array.length;
  while (len > 256) {
    const i = Math.floor(Math.random() * len)
    array.splice(i, 1);
    len--;
  }

  hub.discovery = Object.fromEntries(array);

  // insert the upgraded collection to discover;
  updateHub(hub);

}
