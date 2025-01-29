import { $, errorHandler, getApi, goTo, itemsLoader, notify, renderDataIntoFragment, save } from "./utils";
import { listBtnsContainer, listContainer, listSection, loadingScreen, removeFromListBtn, sortCollectionBtn } from "./dom";
import { store } from "./store";
import i18next from "i18next";


export const reservedCollections = ['discover', 'history', 'favorites', 'listenLater', 'channels', 'playlists'];

export const getDB = (): Library => JSON.parse(localStorage.getItem('library') || '{}');

export const saveDB = (data: Library) => save('library', JSON.stringify(data));

export const getCollection = (name: string) => <HTMLDivElement>(<HTMLDetailsElement>document.getElementById(name)).lastElementChild;


export function removeFromCollection(collection: string, id: string) {
  if (!collection) return;

  const db = getDB();

  delete db[collection][id];
  listContainer.querySelector(`[data-id="${id}"]`)?.remove();
  saveDB(db);
}

export function toCollection(collection: string, data: CollectionItem | DOMStringMap, db: Library) {
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

export function addToCollection(collection: string, data: CollectionItem | DOMStringMap) {

  if (!collection) return;

  const db = getDB();
  toCollection(collection, data, db);
  saveDB(db);
}

export function addListToCollection(collection: string, list: { [index: string]: CollectionItem | DOMStringMap }, db = getDB()) {

  if (!collection) return;

  for (const key in list) {
    const data = list[key];
    toCollection(collection, data, db);
  }
  saveDB(db);
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


export async function fetchCollection(collection: string | null, shared: boolean = false) {

  if (!collection) return;

  const fragment = document.createDocumentFragment();
  const isReserved = reservedCollections.includes(collection);
  const isReversed = listContainer.classList.contains('reverse');

  shared ?
    await getSharedCollection(collection, fragment) :
    getLocalCollection(collection, fragment, isReserved);

  if (!shared && isReserved) {
    if (!isReversed)
      listContainer.classList.add('reverse');
  }
  else if (isReversed)
    listContainer.classList.remove('reverse');

  listBtnsContainer.className = listContainer.classList.contains('reverse') ? 'reserved' : (shared ? 'sharedClxn' : 'collection');

  if (location.pathname !== '/list')
    goTo('/list');

  listSection.scrollTo(0, 0);
  history.replaceState({}, '',
    location.origin + location.pathname +
    (shared ? '?si=' : '?collection=') + collection
  );
  document.title = (collection || 'Shared Collection') + ' - ytify';

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


function getLocalCollection(collection: string, fragment: DocumentFragment, isReserved: boolean) {
  const db = getDB();
  const sort = isReserved ? false : sortCollectionBtn.classList.contains('checked');
  let data = db[decodeURI(collection)];

  if (!data)
    notify(i18next.t("library_utils_not_found_items"));

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

async function getSharedCollection(si: string, fragment: DocumentFragment) {

  loadingScreen.showModal();
  await fetch(`${location.origin}/collection/${si}`)
    .then(res => res.json())
    .then(data => renderDataIntoFragment(data, fragment))
    .catch(() => notify('Failed to load the shared collection, it may consist of a corrupted stream.'))
    .finally(() => loadingScreen.close());

  listContainer.innerHTML = '';
  listContainer.appendChild(fragment);
}



export async function superCollectionLoader(name: SuperCollection) {
  const db = getDB();

  function loadForYou() {
    if ('favorites' in db) {
      const ids = Object
        .keys(db.favorites)
        .filter(id => id.length === 11);
      import('../modules/supermix')
        .then(mod => mod.default(ids));
      return '';
    }
    else return i18next.t("library_utils_not_found_fav");
  }

  const loadFeaturedPls = () => fetch('https://raw.githubusercontent.com/wiki/n-ce/ytify/ytm_pls.md')
    .then(res => res.text())
    .then(text => text.split('\n'))
    .then(data => {
      const array = [];
      for (let i = 0; i < data.length; i += 4)
        array.push(<StreamItem>{
          'type': 'playlist',
          'name': data[i + 1],
          'uploaderName': '',
          'url': '/playlist?list=' + data[i + 2],
          'thumbnail': '/' + data[i + 3]
        });
      return itemsLoader(array);
    });

  function loadUrPls() {
    const fragment = document.createDocumentFragment();
    const pls = Object.keys(db).filter(v => !reservedCollections.includes(v));
    pls.forEach(v => {
      const a = $('a');
      a.href = '/list?collection=' + v;
      a.className = 'ur_cls_item';
      const i = $('i');
      i.className = 'ri-play-list-2-fill';
      a.append(i, v);
      fragment.appendChild(a);
    });
    return pls.length ? fragment : i18next.t("library_utils_not_found_collections");
  }

  /*
  channels / playlists / artists / albums
  > albums are special playlists, id start with OLAK5uy & start with 'Album - ' naturally.
  > artists are special channels which have been manually prepended with 'Artist - ' title.
  */

  function loadSubList(type: string) {
    let albums = false;
    let artists = false;

    if (type === 'albums') {
      albums = true;
      type = i18next.t("library_utils_not_found_playlists_type");
    }

    if (type === 'artists') {
      artists = true;
      type = i18next.t("library_utils_not_found_channels_type");
    }


    if (!Object(db).hasOwnProperty(type))
      return  i18next.t("library_utils_not_found", {type})

    const array = [];
    const pls = db[type] as { [index: string]: Record<'name' | 'uploader' | 'thumbnail' | 'id', string> };

    for (const pl in pls) {
      let name = pls[pl].name;

      if (albums) {
        if (!name.startsWith('Album'))
          continue;
        name = name.slice(8);
      }
      else if (name.startsWith('Album'))
        continue;

      if (artists) {
        if (!name.startsWith('Artist'))
          continue;
        name = name.slice(8);
      }
      else if (name.startsWith('Artist'))
        continue;


      array.push(<StreamItem>{
        type: type.slice(0, -1),
        name: name,
        uploaderName: pls[pl].uploader,
        url: `/${type === 'channels' ? type.slice(0, -1) : type}/` + pls[pl].id,
        thumbnail: pls[pl].thumbnail
      });
    }


    return array.length ?
      itemsLoader(array) :
        i18next.t("library_utils_not_found", {type})
  }

  async function loadFeed() {
    if (!Object(db).hasOwnProperty('channels'))
      return i18next.t("library_utils_not_found_sub");

    loadingScreen.showModal();

    const channels = Object.keys(db.channels).join(',');
    const items = await fetch(getApi('piped') + '/feed/unauthenticated?channels=' + channels)
      .then(res => res.json())
      .catch(err => {
        errorHandler(
          err.message,
          loadFeed,
          () => ''
        );
      })
      .finally(() => loadingScreen.close());

    return itemsLoader(items);
  }


  const container = document.getElementById('superCollectionList') as HTMLDivElement;
  container.replaceChildren(
    name === 'featured' ?
      await loadFeaturedPls() :
      name === 'collections' ?
        loadUrPls() :
        name === 'feed' ?
          await loadFeed() :
          name === 'for_you' ?
            loadForYou() :
            loadSubList(name)
  );
}
