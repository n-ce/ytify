import { setNavStore, setStore, t, updateParam } from '../stores';
import { listStore, setListStore } from '../stores';


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
    console.log(currentList);
    return {};
  });
  saveDB(db);
}



export function toCollection(
  collection: string,
  data: CollectionItem | List,
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
  if ('title' in data)
    data.lastUpdated = new Date().toISOString();
  db[collection][id] = data as CollectionItem;
}

export function addToCollection(
  collection: string,
  data: CollectionItem,
  change = ''
) {

  if (!collection) return;

  const db = getDB();
  toCollection(collection, data, db);
  saveDB(db, change);
}

export function addListToCollection(
  collection: string,
  list: { [index: string]: CollectionItem },
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
    setStore('snackbar', t('list_already_exists'))
  else
    setListStore('addToCollectionOptions', (prev) => [...prev, title]);
}


export async function fetchCollection(
  id: string | null,
  shared: boolean = false
) {
  if (!id) return;

  setListStore('isLoading', true);

  const display = shared ? 'Shared Collection' : id;
  const { reservedCollections } = listStore;
  const isReserved = reservedCollections.includes(id);

  setListStore({
    name: decodeURIComponent(display),
    isReversed: isReserved,
    isShared: shared
  });

  if (shared) {
    await getSharedCollection(id);
    updateParam('si', id);
  }
  else {
    getLocalCollection(id, isReserved);
    updateParam('collection', id);
  }

  setNavStore('list', 'state', true);
  setListStore('isLoading', false);

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
    setStore('snackbar', 'No items found');

  const items = Object.values(dataObj) as CollectionItem[];

  let listData = items;
  let itemsToShow = items.length;
  const usePagination = isReserved && itemsToShow > 20;
  setListStore({
    name: collection,
    length: items.length
  });


  if (usePagination) {
    listData = items.slice(itemsToShow - 1, itemsToShow);;
  }

  setListStore('list', listData);


  // set list

  if (usePagination)
    setObserver(() => {
      itemsToShow -= 1;
      const next = items.slice(itemsToShow - 1, itemsToShow);
      setListStore('list', next);
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

  setListStore('id', decodeURI(collection));
}

async function getSharedCollection(
  id: string
) {


  setListStore('isLoading', true);
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
  setListStore('isLoading', false);
}



