import { render, html } from "lit";
import { $, getSaved, hostResolver, notify, save, superClick } from "./utils";
import { atpSelector } from "../scripts/superModal";
import { listToQ } from "../scripts/queue";


const library = document.getElementById('library') as HTMLDivElement;
export const reservedCollections = ['discover', 'history', 'favorites', 'listenLater'];

export const getDB = (): Library => JSON.parse(getSaved('library') || '{"discover":{}}');

export const saveDB = (data: Library) => save('library', JSON.stringify(data));

export const getCollection = (name: string) => <HTMLDivElement>(<HTMLDetailsElement>document.getElementById(name)).lastElementChild;

export function createCollectionItem(data: CollectionItem | DOMStringMap) {
  const anchor = $('a');
  anchor.href = hostResolver('/watch?v=' + data.id);
  anchor.onclick = e => e.preventDefault();

  render(html`
    <stream-item
      data-id=${data.id} 
      data-title=${data.title}
      data-author=${data.author}
      data-duration=${data.duration}
      data-channel_url=${data.channelUrl}
    />`,
    anchor);
  return anchor;
}

export function removeFromCollection(collection: string, id: string) {
  const db = getDB();
  delete db[collection][id];
  getCollection(collection).querySelector(`[data-id="${id}"]`)?.remove();
  saveDB(db);
}

export function toCollection(collection: string, data: CollectionItem | DOMStringMap, db: Library) {
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
  const dom = getCollection(collection);
  if (collection === 'discover') {
    db.discover = {};
    dom.innerHTML = '';
  }

  for (const key in list) {
    const data = list[key];
    toCollection(collection, data, db);
    if (collection === 'discover' && <number>data.frequency < 2) continue;
    reservedCollections.includes(collection) ?
      fragment.prepend(createCollectionItem(data)) :
      fragment.appendChild(createCollectionItem(data));
  }
  dom.appendChild(fragment);
  saveDB(db);
}

export function createPlaylist(title: string) {

  if (library.contains(document.getElementById(title)))
    return notify('This Playlist Already Exists!');

  const details = $('details');
  details.id = title;

  atpSelector.add(new Option(title, title));
  const atpOption = <HTMLOptionElement>atpSelector.querySelector(`[value="${details.id}"]`);

  render(html`
    <summary>
      <i class="ri-play-list-2-fill"></i> ${title}
    </summary>
    <button @click=${() => {
      atpOption.remove();
      details.remove();
      const db = getDB();
      delete db[details.id];
      saveDB(db);
    }}>
      <i class="ri-delete-bin-2-line"></i> Delete
    </button>
    <button @click=${() => {
      details.querySelectorAll('stream-item').forEach(el => el.classList.toggle('delete'));
      details.classList.toggle('delete');
    }}>
      <i class="ri-subtract-line"></i> Remove
    </button>
    <button @click=${() => listToQ(details.lastElementChild as HTMLDivElement)}>
      <i class="ri-list-check-2"></i> Enqueue
    </button>
    <button @click=${() => {
      const newTitle = prompt('Enter the new title', title);
      if (!newTitle) return;
      atpOption.text = newTitle;
      atpOption.value = newTitle;
      details.id = newTitle;
      (details.firstElementChild as HTMLElement).innerHTML = '<i class="ri-play-list-2-line"></i> ' + newTitle;
      const db = getDB();
      db[newTitle] = db[title];
      delete db[title];
      saveDB(db);
    }}>
      <i class="ri-edit-line"></i> Rename
    </button>
    <div @click=${superClick}></div>
  `, details);

  library.insertBefore(details, library.querySelector('br') as HTMLBRElement);
}
