import { $, errorHandler, getApi, goTo, itemsLoader, notify, renderDataIntoFragment, save } from "./utils";
import { listBtnsContainer, listContainer, listSection, loadingScreen, sortCollectionBtn } from "./dom";
import { store } from "./store";


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
  const sort = isReserved ? false : sortCollectionBtn.classList.contains('checked');
  
  let data;
  let items: [string, CollectionItem | DOMStringMap][];
  let itemsToShow: number;

  if (!shared) {
    const db = getDB();
    data = db[decodeURI(collection)];
    items = Object.entries(data);
    itemsToShow = items.length;
    
    if (collection === 'history')
      data = Object.fromEntries(items.slice(itemsToShow - 1, itemsToShow));

    if (!data || !items.length) {
      notify('No items found');
      return;
    }

    if (collection === 'discover') {
      for (const i in data)
        if ((data[i] as CollectionItem & { frequency: number }).frequency < 2)
          delete db.discover?.[i];
      saveDB(db);
    }


    renderDataIntoFragment(data, fragment, sort);

    store.list.id = collection;

  } else {

    listBtnsContainer.className = 'sharedClxn';
    loadingScreen.showModal();
    await fetch(`${location.origin}/collection/${collection}`)
      .then(res => res.json())
      .then(data => renderDataIntoFragment(data, fragment))
      .catch(() => notify('Failed to load the shared collection, it may consist of a corrupted stream.'))
      .finally(() => loadingScreen.close());

  }


  listContainer.innerHTML = '';
  listContainer.appendChild(fragment);

  if (collection === 'history') {

    function setObserver(callback: () => void) {
      new IntersectionObserver((entries, observer) =>
        entries.forEach(async e => {
          if (e.isIntersecting) {
            callback();
            observer.disconnect();
            if (itemsToShow)
              setObserver(callback);
          }
        }))
        .observe(listContainer.children[3]);
    }
    setObserver(() => {
      itemsToShow -= 1;
      const part = Object.fromEntries(items.slice(itemsToShow - 1, itemsToShow));
      renderDataIntoFragment(part, fragment);
      listContainer.prepend(fragment);
    });
  }



  const isReversed = listContainer.classList.contains('reverse');

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
    else return 'No favorites in library';
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
    return pls.length ? fragment : 'No Collections Found';
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
      type = 'playlists';
    }

    if (type === 'artists') {
      artists = true;
      type = 'channels';
    }


    if (!Object(db).hasOwnProperty(type))
      return `No Subscribed ${type} Found`;

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
      `No Subscribed ${type} Found`;
  }

  async function loadFeed() {
    if (!Object(db).hasOwnProperty('channels'))
      return 'You have not subscribed to any channels';

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
