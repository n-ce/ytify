import { atpSelector, audio, favButton, superModal } from "../lib/dom";
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

  // create collection if it does not exist
  if (!db.hasOwnProperty(collection)) db[collection] = {};

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


// setup initial data

const initialData = getDB();

const initialKeys = Object.keys(initialData);
for (let i = 0; i < initialKeys.length; i++) {
  if (i < 3) {
    const container = getCollection(initialKeys[i]);
    const [clearBtn, removeBtn] = (<HTMLDetailsElement>container.parentElement).querySelectorAll('button');

    clearBtn.addEventListener('click', () => {
      const db = getDB();
      db[initialKeys[i]] = {};
      saveDB(db);
      container.innerHTML = '';
    })
    removeBtn.addEventListener('click', () => {

    })

  }
  else createPlaylist(initialKeys[i]);
}

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
});


// playlists

export function createPlaylist(title: string) {
  const details = document.createElement('details');
  details.id = title;
  const summary = document.createElement('summary');
  const i = document.createElement('i');
  i.className = 'ri-play-list-2-line';
  summary.append(i, ' ' + title);
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => {
    (<HTMLDetailsElement>document.getElementById(title)).remove();
    const db = getDB();
    delete db[title];
    saveDB(db);
  });

  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => {

  });
  details.append(summary, deleteBtn, removeBtn, document.createElement('div'));

  (<HTMLDivElement>document.getElementById('library')).appendChild(details);
  atpSelector.add(new Option(title, title));
}


