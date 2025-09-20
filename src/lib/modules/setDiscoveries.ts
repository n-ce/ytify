import { playerStore } from "../stores";
import { convertSStoHHMMSS, getDB } from "../utils";
import { getHub, updateHub } from "./hub";

export default function(
  id: string,
  relatedStreams: StreamItem[]
) {
  if (id !== playerStore.stream.id) return;

  const hub = getHub();
  const db = getDB();

  if (!hub.discovery)
    hub.discovery = {};


  relatedStreams?.forEach(
    stream => {
      if (
        stream.type !== 'stream' ||
        stream.duration < 100 || stream.duration > 3000) return;

      const rsId = stream.url.slice(9);

      // merges previous discover items with current related streams
      hub.discovery?.hasOwnProperty(rsId) ?
        (hub.discovery[rsId].frequency)++ :
        hub.discovery[rsId] = {
          id: rsId,
          title: stream.title,
          author: stream.uploaderName,
          duration: convertSStoHHMMSS(stream.duration),
          channelUrl: stream.uploaderUrl,
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
  array = array.filter(e => !db.history?.hasOwnProperty(e[0]));

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
