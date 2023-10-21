import { atpSelector, audio, favButton, superModal } from "../lib/dom";
import { getCollection, getDB, saveDB } from "../lib/utils";


export function createCollectionItem(data: CollectionItem | DOMStringMap) {

  const item = document.createElement('stream-item');
  item.dataset.id = data.id;
  item.textContent = item.dataset.title = <string>data.title;
  item.dataset.author = data.author;
  item.dataset.thumbnail = data.thumbnail;
  item.dataset.duration = data.duration;
  item.addEventListener('click', () => {
    if (item.classList.contains('delete'))
      return removeFromCollection((<HTMLDetailsElement>(<HTMLDivElement>item.parentElement).parentElement).id, <string>data.id);

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

  ['discover', 'history', 'favorites'].includes(collection) ?
    getCollection(collection).prepend(createCollectionItem(data)) :
    getCollection(collection).appendChild(createCollectionItem(data));

  saveDB(db);
}

function removeFromCollection(collection: string, id: string) {
  const db = getDB();
  delete db[collection][id];
  getCollection(collection).querySelector(`[data-id="${id}"]`)?.remove();
  saveDB(db);
}


// playlists

export function createPlaylist(title: string) {
  const library = <HTMLDivElement>document.getElementById('library');

  if (library.contains(document.getElementById(title)))
    return alert('This Playlist Already Exists!');

  const details = document.createElement('details');
  details.id = title;
  const summary = document.createElement('summary');
  const i = document.createElement('i');
  i.className = 'ri-play-list-2-line';
  summary.append(i, ' ' + title);
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => {
    details.remove();
    const db = getDB();
    delete db[title];
    saveDB(db);
    (<HTMLOptionElement>atpSelector.querySelector(`[value="${title}"]`)).remove();
  });
  const div = document.createElement('div');
  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => {
    div.querySelectorAll('stream-item').forEach(e => e.classList.toggle('delete'));
    removeBtn.classList.toggle('delete');
  });
  details.append(summary, deleteBtn, removeBtn, div);

  library.appendChild(details);

  atpSelector.add(new Option(title, title));
}


// setup initial data after 1.5s to speedup initial load
setTimeout(() => {
  const initialData = getDB();

  const initialKeys = Object.keys(initialData);

  for (let i = 0; i < initialKeys.length; i++) {
    if (i > 2) {
      createPlaylist(initialKeys[i]);
      continue;
    }
    const container = getCollection(initialKeys[i]);
    const [clearBtn, removeBtn] = (<HTMLDetailsElement>container.parentElement).querySelectorAll('button');

    clearBtn.addEventListener('click', () => {
      const db = getDB();
      db[initialKeys[i]] = {};
      saveDB(db);
      container.innerHTML = '';
    })
    removeBtn.addEventListener('click', () => {
      container.querySelectorAll('stream-item').forEach(e => e.classList.toggle('delete'));
      removeBtn.classList.toggle('delete');
    })
  }

  for (const collection in initialData)
    for (const stream in initialData[collection])
      addToCollection(collection, initialData[collection][stream]);
}, 1500);

// favorites button & data

favButton.addEventListener('click', () => {
  const id = audio.dataset.id;
  if (!id) return;
  favButton.checked ?
    addToCollection('favorites', audio.dataset) :
    removeFromCollection('favorites', id);

  (<HTMLLabelElement>favButton.nextElementSibling).classList.toggle('ri-heart-fill');
});

