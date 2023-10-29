import { atpSelector, audio, favButton, superModal } from "../lib/dom";
import { $, getCollection, getDB, saveDB } from "../lib/utils";
import { listToQ } from "./queue";

const reservedCollections = ['discover', 'history', 'favorites'];

const importBtn = <HTMLInputElement>document.getElementById('upload');
importBtn.addEventListener('change', async () => {
  if (!confirm('This will overwrite your current library')) return;
  saveDB(JSON.parse(await (<FileList>importBtn.files)[0].text()));
  location.reload();
});


(<HTMLButtonElement>document.getElementById('exportBtn')).addEventListener('click', () => {
  const link = $('a');
  link.download = 'ytify_library.json';
  link.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(getDB(), undefined, 2))}`;
  link.click();
});


export function createCollectionItem(data: CollectionItem | DOMStringMap) {

  const item = $('stream-item');
  item.dataset.id = data.id;
  item.textContent = item.dataset.title = <string>data.title;
  item.dataset.author = data.author;
  item.dataset.channelUrl = data.channelUrl;
  item.dataset.thumbnail = data.thumbnail;
  item.dataset.duration = data.duration;
  item.addEventListener('click', () => {
    if (item.classList.contains('delete'))
      return removeFromCollection((<HTMLDetailsElement>(<HTMLDivElement>item.parentElement).parentElement).id, <string>data.id);

    superModal.showModal();
    history.pushState({}, '', '#');
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

function toCollection(collection: string, data: CollectionItem | DOMStringMap, db: Library) {
  const id = <string>data.id;
  if (db.hasOwnProperty(collection)) {
    if (db[collection].hasOwnProperty(id)) { // delete old data if already exists
      delete db[collection][id];
      getCollection(collection).querySelector(`[data-id="${id}"]`)?.remove();
    }
  } // create if collection does not exists
  else db[collection] = {};
  db[collection][id] = data;
}

export function addToCollection(collection: string, data: CollectionItem | DOMStringMap) {
  const db = getDB();
  toCollection(collection, data, db);
  reservedCollections.includes(collection) ?
    getCollection(collection).prepend(createCollectionItem(data)) :
    getCollection(collection).appendChild(createCollectionItem(data));
  saveDB(db);
}

export function addListToCollection(collection: string, list: { [index: string]: CollectionItem | DOMStringMap }, db = getDB()) {
  const fragment = document.createDocumentFragment();
  if (collection === 'discover') {
    db.discover = {};
    getCollection('discover').innerHTML = '';
  }
  for (const key in list) {
    const data = list[key];
    toCollection(collection, data, db);
    if (collection === 'discover' && <number>data.frequency < 2) continue;
    reservedCollections.includes(collection) ?
      fragment.prepend(createCollectionItem(data)) :
      fragment.appendChild(createCollectionItem(data));
  }
  getCollection(collection).appendChild(fragment);
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
  summary.innerHTML = '<i class="ri-play-list-2-line"></i> ' + title;

  const deleteBtn = $('button');
  deleteBtn.innerHTML = '<i class="ri-delete-bin-7-line"></i> Delete';
  deleteBtn.addEventListener('click', () => {
    atpOption.remove();
    details.remove();
    const db = getDB();
    delete db[details.id];
    saveDB(db);
  });
  const div = $('div');
  const removeBtn = $('button');
  removeBtn.innerHTML = '<i class="ri-subtract-line"></i> Remove';
  removeBtn.addEventListener('click', () => {
    div.querySelectorAll('stream-item').forEach(e => e.classList.toggle('delete'));
    removeBtn.classList.toggle('delete');
  });
  const enqueueBtn = $('button');
  enqueueBtn.innerHTML = '<i class="ri-list-check-2"></i> Enqueue';
  enqueueBtn.onclick = () => listToQ(div);
  const renameBtn = $('button');
  renameBtn.innerHTML = '<i class="ri-edit-line"></i> Rename';
  renameBtn.addEventListener('click', () => {
    const newTitle = prompt('Enter the new title', title);
    if (!newTitle) return;
    atpOption.text = newTitle;
    atpOption.value = newTitle;
    details.id = newTitle;
    summary.innerHTML = '<i class="ri-play-list-2-line"></i> ' + newTitle;
    const db = getDB();
    db[newTitle] = db[title];
    delete db[title];
    saveDB(db);
  });

  details.append(summary, deleteBtn, removeBtn, enqueueBtn, renameBtn, div);

  library.insertBefore(details, <HTMLBRElement>document.querySelector('br'));
}


// setup initial dom state

addEventListener('DOMContentLoaded', () => {
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
      delete db[key];
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
    addListToCollection(collection, initialData[collection], initialData);
});

// favorites button & data

favButton.addEventListener('click', () => {
  const id = audio.dataset.id;
  if (!id) return;
  favButton.checked ?
    addToCollection('favorites', audio.dataset) :
    removeFromCollection('favorites', id);

  (<HTMLLabelElement>favButton.nextElementSibling).classList.toggle('ri-heart-fill');
});

