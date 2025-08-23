import { openDialog, t } from '../stores';
import { listStore, setListStore } from '../stores';
import { goTo } from './helpers';


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
  setListStore('list', (currentList) => {
    const { keyToRemove, ...newList } = currentList;
    return newList;
  });
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
  const exists = listStore
    .reservedCollections
    .concat(listStore.addToCollectionOptions)
    .includes(title);
  if (exists)
    openDialog('snackbar', t('list_already_exists'))
  else
    setListStore('addToCollectionOptions', (prev) => [...prev, title]);
}


export async function fetchCollection(
  id: string | null,
  shared: boolean = false
) {
  if (!id) return;


  const display = shared ? 'Shared Collection' : id;
  const { reservedCollections, isReversed } = listStore;
  const isReserved = reservedCollections.includes(id);

  setListStore('name', decodeURIComponent(display));

  shared ?
    await getSharedCollection(id) :
    getLocalCollection(id, isReserved);

  if (!shared && isReserved) {
    if (!isReversed)
      setListStore('isReversed', true);
  }
  else if (isReversed)
    setListStore('isReversed', false);

  //listBtnsContainer.className = isReversed ? 'reserved' : (shared ? 'shared' : 'collection');
  /*
    if (listBtnsContainer.classList.contains('favorites')) {
      if (id !== 'favorites')
        listBtnsContainer.classList.remove('favorites');
    }
    else if (id === 'favorites')
      listBtnsContainer.classList.add('favorites');
  */
  if (location.pathname !== '/list')
    goTo('/list');

  // listSection.scrollTo(0, 0);
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
  // .observe(listContainer.children[0]);
}


function getLocalCollection(
  collection: string,
  isReserved: boolean
) {
  const db = getDB();
  //const sort = isReserved ? false : sortCollectionBtn.classList.contains('checked');
  let dataObj = db[decodeURI(collection)];

  if (!dataObj)
    openDialog('snackbar', 'No items found');

  const items = Object.values(dataObj);
  let listData: (CollectionItem | DOMStringMap)[] = items;
  let itemsToShow = items.length;
  const usePagination = isReserved && itemsToShow > 20;
  setListStore('name', listStore.name + ` | ${items.length} streams`);

  if (collection === 'discover') {
    for (const i in dataObj)
      if (usePagination && (dataObj[i] as CollectionItem & { frequency: number }).frequency < 2)
        delete db.discover?.[i];
    saveDB(db);
  }

  if (usePagination) {
    listData = items.slice(itemsToShow - 1, itemsToShow);;
  }
  console.log(listData);
  // set list

  if (usePagination)
    setObserver(() => {
      itemsToShow -= 1;
      const next = items.slice(itemsToShow - 1, itemsToShow);
      const frag = document.createDocumentFragment();
      console.log(next, frag);
      //  renderCollection(next, sort, frag);

      /*
            if (removeFromListBtn.classList.contains('delete'))
              frag.childNodes.forEach(v => {
                if (v instanceof HTMLElement)
                  v.classList.add('delete');
              });
              
      
            listContainer.prepend(frag);
      */
      return itemsToShow;
    });

  listStore.id = decodeURI(collection);
}

async function getSharedCollection(
  id: string
) {

  //  loadingScreen.showModal();

  const data = await fetch(`${location.origin}/blob/${id}`)
    .then(res => res.json())
    .catch(() => '');
  console.log(data);
  /*
    if (data)
      renderCollection(data);
    else
      render(listContainer, html`Collection does not exist`);
  */
  // loadingScreen.close();
}



