import { superModal } from "../lib/dom";
import { getSaved, save } from "../lib/utils";

type Library = {
  [index: string]: {
    [index: string]: DOMStringMap
  }
}



const getDB = (): Library => JSON.parse(getSaved('library') || '{}');

const saveDB = (data: Library) => save('library', JSON.stringify(data));


export function addToCollection(collection: string, data: DOMStringMap) {
  const db = getDB();
  if (!db.hasOwnProperty(collection))
    db[collection] = {};
  const id = <string>data.id;

  // remove previous stream if exists
  if (db[collection].hasOwnProperty(id)) {
    delete db[collection][id];
    document.getElementById(collection)?.querySelector('[data-id=' + id + ']')?.remove();
  }

  db[collection][id] = data;
  const item = document.createElement('stream-item');
  item.dataset.id = id;
  item.textContent = item.dataset.title = data.title || '';
  item.dataset.author = data.author;
  item.dataset.thumbnail = data.thumbnail;
  item.dataset.duration = data.duration;
  item.addEventListener('click', () => {
    superModal.classList.toggle('hide');
    const _ = superModal.dataset;
    _.id = id;
    _.title = data.title;
    _.thumbnail = data.thumbnail;
    _.author = data.author;
    _.channelUrl = data.channelUrl;
    _.duration = data.duration;
  })

  document.getElementById(collection)?.prepend(item);

  saveDB(db);
}

export function removeFromCollection(collection: string, id: string) {
  const db = getDB();
  delete db[collection][id];
  document.getElementById(collection)?.querySelector('[data-id=' + id + ']')?.remove();
  saveDB(db);
}

const initialData = getDB();

for (const collection in initialData)
  for (const stream in initialData[collection])
    addToCollection(collection, initialData[collection][stream]);