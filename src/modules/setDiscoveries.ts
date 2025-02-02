import { listAnchor } from "../lib/dom";
import { addListToCollection, getDB } from "../lib/libraryUtils";
import { params, store } from "../lib/store";
import { convertSStoHHMMSS, goTo } from "../lib/utils";

export default function(
  id: string,
  relatedStreams: StreamItem[]
) {
  if (id !== store.stream.id) return;

  const db = getDB();

  if (!db.hasOwnProperty('discover'))
    db.discover = {};


  relatedStreams?.forEach(
    stream => {
      if (
        stream.type !== 'stream' ||
        stream.duration < 100 || stream.duration > 3000) return;

      const rsId = stream.url.slice(9);

      // merges previous discover items with current related streams
      db.discover?.hasOwnProperty(rsId) ?
        (<number>db.discover[rsId].frequency)++ :
        db.discover![rsId] = {
          id: rsId,
          title: stream.title,
          author: stream.uploaderName,
          duration: convertSStoHHMMSS(stream.duration),
          channelUrl: stream.uploaderUrl,
          frequency: 1
        }
    });

  // convert to array
  let array = Object.entries(db.discover!);

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

  db.discover = {};

  // insert the upgraded collection to discover;
  addListToCollection('discover', Object.fromEntries(array), db);

  // just in case we are already in the discover collection 
  if (listAnchor.classList.contains('view') && params.get('collection') === 'discover')
    goTo('discover');


}
