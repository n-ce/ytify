import { goTo, hostResolver, notify } from "./utils";
import { store } from "./store";
import { render, html } from "uhtml";
import StreamItem from "../components/StreamItem";

export const reservedCollections = ['discover', 'history', 'favorites', 'listenLater', 'channels', 'playlists'];

export const getDB = (): Library => JSON.parse(localStorage.getItem('library') || '{}');

export function saveDB(data: Library, change: string = '') {
  localStorage.setItem('library', JSON.stringify(data));
  dispatchEvent(new CustomEvent('dbchange', { detail: { db: data, change: change } }));
}

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

  reservedCollections
    .concat(
      store.addToCollectionOptions
    )
    .includes(title) ?
    notify('This Playlist Already Exists!') :
    store.addToCollectionOptions.push(title);
}

export function renderCollection(
  data: (DOMStringMap | CollectionItem)[],
  draggable = false,
  fragment: DocumentFragment | HTMLDivElement = listContainer
) {
  render(fragment, html`${data.map(v =>
    StreamItem({
      id: v.id || '',
      href: hostResolver(`/watch?v=${v.id}`),
      title: v.title || '',
      author: v.author,
      duration: v.duration || '',
      channelUrl: v.channelUrl,
      draggable: draggable
    })
  )
    }`);
}

export async function fetchCollection(
  id: string | null,
  shared: boolean = false
) {
  if (!id) return;


  const display = shared ? 'Shared Collection' : id
  const isReserved = reservedCollections.includes(id);
  const isReversed = listContainer.classList.contains('reverse');

  listTitle.textContent = decodeURIComponent(display);

  shared ?
    await getSharedCollection(id) :
    getLocalCollection(id, isReserved);

  if (!shared && isReserved) {
    if (!isReversed)
      listContainer.classList.add('reverse');
  }
  else if (isReversed)
    listContainer.classList.remove('reverse');

  listBtnsContainer.className = listContainer.classList.contains('reverse') ? 'reserved' : (shared ? 'shared' : 'collection');

  if (listBtnsContainer.classList.contains('favorites')) {
    if (id !== 'favorites')
      listBtnsContainer.classList.remove('favorites');
  }
  else if (id === 'favorites')
    listBtnsContainer.classList.add('favorites');

  if (location.pathname !== '/list')
    goTo('/list');

  listSection.scrollTo(0, 0);
  history.replaceState({}, '',
    location.origin + location.pathname +
    (shared ? '?si=' : '?collection=') + id
  );
  document.title = display + ' - ytify';

}

function setObserver(callback: () => number) {
  new IntersectionObserver((entries, observer) =>
    entries.forEach(e => {
      if (e.isIntersecting) {
        observer.disconnect();
        const itemsLeft = callback();
        if (itemsLeft)
          setObserver(callback);

      }
    }))
    .observe(listContainer.children[0]);
}


function getLocalCollection(
  collection: string,
  isReserved: boolean
) {
  const db = getDB();
  const sort = isReserved ? false : sortCollectionBtn.classList.contains('checked');
  let dataObj = db[decodeURI(collection)];

  if (!dataObj)
    notify('No items found');

  const items = Object.values(dataObj);
  let listData: (CollectionItem | DOMStringMap)[] = items;
  let itemsToShow = items.length;
  const usePagination = isReserved && itemsToShow > 20;
  listTitle.textContent += ` | ${items.length} streams`;

  if (collection === 'discover') {
    for (const i in dataObj)
      if (usePagination && (dataObj[i] as CollectionItem & { frequency: number }).frequency < 2)
        delete db.discover?.[i];
    saveDB(db);
  }

  if (usePagination) {
    listData = items.slice(itemsToShow - 1, itemsToShow);;
  }

  render(listContainer, html``);
  renderCollection(listData, sort);

  if (usePagination)
    setObserver(() => {
      itemsToShow -= 1;
      const next = items.slice(itemsToShow - 1, itemsToShow);
      const frag = document.createDocumentFragment();
      renderCollection(next, sort, frag);


      if (removeFromListBtn.classList.contains('delete'))
        frag.childNodes.forEach(v => {
          if (v instanceof HTMLElement)
            v.classList.add('delete');
        });

      listContainer.prepend(frag);

      return itemsToShow;
    });

  store.list.id = decodeURI(collection);
}

async function getSharedCollection(
  id: string
) {

  loadingScreen.showModal();

  const data = await fetch(`${location.origin}/blob/${id}`)
    .then(res => res.json())
    .catch(() => '');

  if (data)
    renderCollection(data);
  else
    render(listContainer, html`Collection does not exist`);

  loadingScreen.close();
}



