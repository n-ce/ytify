import { audio } from "../lib/dom";
import { convertSStoHHMMSS, getCollection, getDB, saveDB } from "../lib/utils";
import { createCollectionItem } from "./library";

export default function discover(relatedStreams: StreamItem[], rootID: string) {
  if (audio.dataset.id !== rootID) return;
  const db = getDB();

  // merge previous discover items with current related streams

  for (const stream of relatedStreams) {
    if (stream.type !== 'stream') return;

    const id = stream.url.slice(9);

    db.discover.hasOwnProperty(id) ?
      (<number>db.discover[id].frequency)++ :
      db.discover[id] = {
        id: id,
        title: stream.title,
        thumbnail: stream.thumbnailUrl,
        author: stream.uploaderName,
        duration: convertSStoHHMMSS(stream.duration),
        channelUrl: stream.uploaderUrl,
        frequency: 1
      }
  }

  // sorted the array form of merged objects because objects are not sortable
  const sortedArray = Object.entries(db.discover).sort((a, b) => <number>a[1].frequency - <number>b[1].frequency);


  // obliterate the previous discover
  db.discover = {};
  getCollection('discover').innerHTML =
    `<summary>
       <i class="ri-compass-3-line"></i> Discover
     </summary>`;

  // generate new discover
  sortedArray.forEach(i => {
    db.discover[i[0]] = i[1];
    if ((<number>i[1].frequency) > 1)
      getCollection('discover').prepend(createCollectionItem(i[1]));
  });

  saveDB(db);
}