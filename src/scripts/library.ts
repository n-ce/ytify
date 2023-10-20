import { audio, favButton, superModal } from "../lib/dom";
import { getCollection, getDB, saveDB } from "../lib/utils";


export function createCollectionItem(data: CollectionItem | DOMStringMap) {

  const item = document.createElement('stream-item');
  item.dataset.id = data.id;
  item.textContent = item.dataset.title = data.title || '';
  item.dataset.author = data.author;
  item.dataset.thumbnail = data.thumbnail;
  item.dataset.duration = data.duration;
  item.addEventListener('click', () => {
    superModal.classList.toggle('hide');
    const _ = superModal.dataset;
    _.id = data.id;
    _.title = data.title;
    _.thumbnail = data.thumbnail;
    _.author = data.author;
    _.channelUrl = data.channelUrl;
    _.duration = data.duration;
  })
  return item;
}



export function addToCollection(collection: string, data: CollectionItem | DOMStringMap) {
  const db = getDB();
  const id = <string>data.id;

  if (collection === 'discover' && <number>data.frequency < 2) return;

  // remove previous stream if exists
  if (db[collection].hasOwnProperty(id)) {
    if (collection === 'discover') {
      (<number>db[collection][id].frequency)++;
    }
    delete db[collection][id];

    getCollection(collection).querySelector(`[data-id="${id}"]`)?.remove();
  }

  db[collection][id] = data;

  getCollection(collection).prepend(createCollectionItem(data));

  saveDB(db);
}

export function removeFromCollection(collection: string, id: string) {
  const db = getDB();
  delete db[collection][id];
  getCollection(collection).querySelector(`[data-id="${id}"]`)?.remove();
  saveDB(db);
}

const initialData = getDB();

for (const collection in initialData)
  for (const stream in initialData[collection])
    addToCollection(collection, initialData[collection][stream]);





// favorites button & data

const icons = ['ri-heart-line', 'ri-heart-fill'];
favButton.addEventListener('click', () => {
  if (!audio.dataset.id) return;
  favButton.checked ?
    addToCollection('favorites', audio.dataset) :
    removeFromCollection('favorites', <string>audio.dataset.id);

  (<HTMLLabelElement>favButton.nextElementSibling).classList.replace(icons[0], icons[1]);
  icons.reverse();
})
