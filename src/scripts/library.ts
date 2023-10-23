import { atpSelector, audio, favButton, superModal } from "../lib/dom";
import { $, getCollection, getDB, saveDB } from "../lib/utils";
import { listToQ } from "./queue";

const reservedCollections = ['discover', 'history', 'favorites'];

export function createCollectionItem(data: CollectionItem | DOMStringMap) {

  const item = $('stream-item');
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
    _.author = data.author;
    _.duration = data.duration;
    _.thumbnail = data.thumbnail;
    _.channelUrl = data.channelUrl;
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

  reservedCollections.includes(collection) ?
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

  const details = $('details');
  details.id = title;

  atpSelector.add(new Option(title, title));
  const atpOption = <HTMLOptionElement>atpSelector.querySelector(`[value="${details.id}"]`);

  const summary = $('summary');
  const i = $('i');
  i.className = 'ri-play-list-2-line';
  summary.append(i, ' ' + title);

  const deleteBtn = $('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => {
    atpOption.remove();
    details.remove();
    const db = getDB();
    delete db[details.id];
    saveDB(db);
  });
  const div = $('div');
  const removeBtn = $('button');
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => {
    div.querySelectorAll('stream-item').forEach(e => e.classList.toggle('delete'));
    removeBtn.classList.toggle('delete');
  });
  const enqueueBtn = $('button');
  enqueueBtn.textContent = 'Enqueue';
  enqueueBtn.onclick = () => listToQ(div);
  const renameBtn = $('button');
  renameBtn.textContent = 'Rename';
  renameBtn.addEventListener('click', () => {
    const newTitle = prompt('Enter the new title', title);
    if (!newTitle) return;
    atpOption.text = newTitle;
    atpOption.value = newTitle;
    details.id = newTitle;
    summary.innerHTML = '';
    summary.append(i, ' ' + newTitle);
    const db = getDB();
    db[newTitle] = db[title];
    delete db[title];
    saveDB(db);
  });

  details.append(summary, deleteBtn, removeBtn, enqueueBtn, renameBtn, div);

  library.appendChild(details);

}


// setup initial data after 1.5s to speedup initial load
setTimeout(() => {
  const initialData = getDB();

  const initialKeys = Object.keys(initialData);

  for (const key of initialKeys) {
    if (!reservedCollections.includes(key)) {
      createPlaylist(key);
      continue;
    }
    const container = getCollection(key);
    const [clearBtn, removeBtn, enqueueBtn] = (<HTMLDetailsElement>container.parentElement).querySelectorAll('button');

    clearBtn.addEventListener('click', () => {
      const db = getDB();
      db[key] = {};
      saveDB(db);
      container.innerHTML = '';
    })
    removeBtn.addEventListener('click', () => {
      container.querySelectorAll('stream-item').forEach(e => e.classList.toggle('delete'));
      removeBtn.classList.toggle('delete');
    })

    if (key === 'favorites')
      enqueueBtn.onclick = () => listToQ(container);

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

