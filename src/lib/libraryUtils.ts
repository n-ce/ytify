import { goTo, notify, renderDataIntoFragment } from "./utils";
import { listBtnsContainer, listContainer, listSection, loadingScreen, removeFromListBtn, sortCollectionBtn } from "./dom";
import { store } from "./store";

export const reservedCollections = ['discover', 'history', 'favorites', 'listenLater', 'channels', 'playlists'];

export const getDB = (): Library => JSON.parse(localStorage.getItem('library') || '{}');

export function saveDB(data: Library, change: string = '') {
  localStorage.setItem('library', JSON.stringify(data));
  dispatchEvent(new CustomEvent('dbchange', { detail: { db: data, change: change } }));
}

export const getCollection = (name: string) => <HTMLDivElement>(<HTMLDetailsElement>document.getElementById(name)).lastElementChild;


export function removeFromCollection(
  collection: string,
  id: string
) {
  if (!collection) return;

  const db = getDB();

  delete db[collection][id];
  listContainer.querySelector(`[data-id="${id}"]`)?.remove();
  saveDB(db);
}

export function toCollection(
  collection: string,
  data: CollectionItem | DOMStringMap,
  db: Library
) {
  if (!collection) return;
  const id = <string>data.id;

  if (db.hasOwnProperty(collection)) {
    if (db[collection].hasOwnProperty(id))
      // delete old data if already exists
      delete db[collection][id];
  }
  // create if collection does not exists
  else db[collection] = {};

  db[collection][id] = data;
}

export function addToCollection(
  collection: string,
  data: CollectionItem | DOMStringMap,
  change = ''
) {

  if (!collection) return;

  const db = getDB();
  toCollection(collection, data, db);
  saveDB(db, change);
}

export function addListToCollection(
  collection: string,
  list: { [index: string]: CollectionItem | DOMStringMap },
  db = getDB()
) {

  if (!collection) return;

  for (const key in list) {
    const data = list[key];
    toCollection(collection, data, db);
  }
  saveDB(db, 'listAdded');
}

export function createCollection(title: string) {
  const collectionSelector = document.getElementById('collectionSelector') as HTMLSelectElement;

  reservedCollections
    .concat(
      [...collectionSelector.options].slice(2).map(opt => opt.value)
    )
    .includes(title) ?
    notify('This Playlist Already Exists!') :
    collectionSelector.add(new Option(title, title));
}


export async function fetchCollection(
  id: string | null,
  shared: boolean = false
) {

  if (!id) return;

  const fragment = document.createDocumentFragment();
  const isReserved = reservedCollections.includes(id);
  const isReversed = listContainer.classList.contains('reverse');


  shared ?
    await getSharedCollection(id, fragment) :
    getLocalCollection(id, fragment, isReserved);

  if (!shared && isReserved) {
    if (!isReversed)
      listContainer.classList.add('reverse');
  }
  else if (isReversed)
    listContainer.classList.remove('reverse');

  listBtnsContainer.className = listContainer.classList.contains('reverse') ? 'reserved' : (shared ? 'shared' : 'collection');

  if (location.pathname !== '/list')
    goTo('/list');

  listSection.scrollTo(0, 0);
  history.replaceState({}, '',
    location.origin + location.pathname +
    (shared ? '?si=' : '?collection=') + id
  );
  document.title = (shared ? 'Shared Collection' : id) + ' - ytify';

}

function setObserver(callback: () => number) {
  new IntersectionObserver((entries, observer) =>
    entries.forEach(e => {
      if (e.isIntersecting) {
        const itemsLeft = callback();
        observer.disconnect();
        if (itemsLeft)
          setObserver(callback);
      }
    }))
    .observe(listContainer.children[0]);
}


function getLocalCollection(
  collection: string,
  fragment: DocumentFragment,
  isReserved: boolean
) {
  const db = getDB();
  const sort = isReserved ? false : sortCollectionBtn.classList.contains('checked');
  let data = db[decodeURI(collection)];

  if (!data)
    notify('No items found');

  const items = Object.entries(data);
  let itemsToShow = items.length;
  const usePagination = isReserved && itemsToShow > 20;

  if (collection === 'discover') {
    for (const i in data)
      if ((data[i] as CollectionItem & { frequency: number }).frequency < 2)
        delete db.discover?.[i];
    saveDB(db);
  }

  if (usePagination)
    data = Object.fromEntries(items.slice(itemsToShow - 1, itemsToShow));
  renderDataIntoFragment(data, fragment, sort);
  listContainer.innerHTML = '';
  listContainer.appendChild(fragment);

  if (usePagination)
    setObserver(() => {
      itemsToShow -= 1;
      const part = Object.fromEntries(items.slice(itemsToShow - 1, itemsToShow));
      renderDataIntoFragment(part, fragment);
      if (removeFromListBtn.classList.contains('delete'))
        fragment.childNodes.forEach(v => {
          (v as HTMLElement).classList.add('delete');
        })
      listContainer.prepend(fragment);
      return itemsToShow;
    });

  store.list.id = collection;
}

async function getSharedCollection(
  id: string,
  fragment: DocumentFragment
) {

  loadingScreen.showModal();

  const data = await fetch(`${location.origin}/blob/${id}`)
    .then(res => res.json())
    .catch(() => '');

  if (data) {
    renderDataIntoFragment(data, fragment)
    listContainer.innerHTML = '';
    listContainer.appendChild(fragment);
  }
  else
    listContainer.innerHTML = 'Collection does not exist';

  loadingScreen.close();
}



