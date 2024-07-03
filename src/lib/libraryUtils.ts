import { $, getApi, getSaved, goTo, hostResolver, itemsLoader, notify, save } from "./utils";
import { atpSelector } from "../scripts/superModal";
import { listAnchor, listBtnsContainer, listContainer, listSection, loadingScreen } from "./dom";
import { render } from "solid-js/web";
import StreamItem from "../components/StreamItem";


export const reservedCollections = ['discover', 'history', 'favorites', 'listenLater', 'channels', 'playlists'];

export const getDB = (): Library => JSON.parse(getSaved('library') || '{"discover":{}}');

export const saveDB = (data: Library) => save('library', JSON.stringify(data));

export const getCollection = (name: string) => <HTMLDivElement>(<HTMLDetailsElement>document.getElementById(name)).lastElementChild;


export function removeFromCollection(collection: string, id: string) {
  const db = getDB();
  delete db[collection][id];
  const item = listContainer.querySelector(`[data-id="${id}"]`) as HTMLAnchorElement;
  item.remove();
  saveDB(db);
}

export function toCollection(collection: string, data: CollectionItem | DOMStringMap, db: Library) {
  const id = <string>data.id;
  if (db.hasOwnProperty(collection)) {
    if (db[collection].hasOwnProperty(id))// delete old data if already exists
      delete db[collection][id];
  } // create if collection does not exists
  else db[collection] = {};
  db[collection][id] = data;
}

export function addToCollection(collection: string, data: CollectionItem | DOMStringMap) {
  const db = getDB();
  toCollection(collection, data, db);
  saveDB(db);
}

export function addListToCollection(collection: string, list: { [index: string]: CollectionItem | DOMStringMap }, db = getDB()) {

  if (collection === 'discover')
    db.discover = {};

  for (const key in list) {
    const data = list[key];
    toCollection(collection, data, db);
  }
  saveDB(db);
}

export function createPlaylist(title: string) {
  reservedCollections
    .concat(
      [...atpSelector.options].slice(2).map(opt => opt.value)
    )
    .includes(title) ?
    notify('This Playlist Already Exists!') :
    atpSelector.add(new Option(title, title));
}


export async function fetchCollection(collection: string | null, shareId: string | null = '') {

  const fragment = document.createDocumentFragment();

  if (collection) {
    const db = getDB();
    const data = db[collection];

    if (collection === 'discover')
      for (const i in data)
        if (data[i].frequency as number < 2)
          delete db.discover[i];

    for (const item in data) {
      const d = data[item];
      render(() => StreamItem({
        id: d.id || '',
        href: hostResolver(`/watch?v=${d.id}`),
        title: d.title || '',
        author: d.author || '',
        duration: d.duration || '',
        channelUrl: d.channelUrl || ''
      }), fragment);
    }
    if (!fragment.childElementCount) {
      alert('No items found');
      return;
    }
    listAnchor.dataset.id = collection;

  } else {
    // this means it does not exist in db and is a public collection

    listBtnsContainer.className = 'publicPlaylist';
    loadingScreen.showModal();
    await fetch(`${location.origin}/public?id=${shareId}`)
      .then(res => res.json())
      .then(data => {
        for (const d of data)
          render(() => StreamItem({
            id: d.id || '',
            href: hostResolver(`/watch?v=${d.id}`),
            title: d.title || '',
            author: d.author || '',
            duration: d.duration || '',
            channelUrl: d.channelUrl || ''
          }), fragment);
      })
      .finally(() => loadingScreen.close());

  }


  listContainer.innerHTML = '';
  listContainer.appendChild(fragment);

  const isReversed = listContainer.classList.contains('reverse');

  if (collection && reservedCollections.includes(collection)) {
    if (!isReversed)
      listContainer.classList.add('reverse');
  }
  else if (isReversed)
    listContainer.classList.remove('reverse');


  listBtnsContainer.className = listContainer.classList.contains('reverse') ? 'reserved' : (collection ? 'collection' : 'publicCollection');

  if (location.pathname !== '/list') goTo('/list');

  listSection.scrollTo(0, 0);
  history.replaceState({}, '',
    location.origin + location.pathname +
    (collection ? ('?collection=' + collection) : ('?shareId=' + shareId)));
  document.title = (collection || 'Shared Playlist') + ' - ytify';
}


export async function superCollectionLoader(name: 'featured' | 'collections' | 'channels' | 'feed' | 'playlists') {
  const db = getDB();

  const loadFeaturedPls = () => fetch('https://raw.githubusercontent.com/wiki/n-ce/ytify/ytm_pls.md')
    .then(res => res.text())
    .then(text => text.split('\n'))
    .then(data => {
      const array = [];
      for (let i = 0; i < data.length; i += 4)
        array.push(<StreamItem>{
          "type": "playlist",
          "name": data[i + 1],
          "uploaderName": "YouTube Music",
          "url": '/playlists/' + data[i + 2],
          "thumbnail": '/' + data[i + 3]
        });
      return itemsLoader(array);
    });

  function loadUrPls() {
    const fragment = document.createDocumentFragment();
    const pls = Object.keys(db).filter(v => !reservedCollections.includes(v));
    pls.forEach(v => {
      const a = $('a');
      a.href = '/list?collection=' + v;
      a.className = 'ur_pls_item';
      const i = $('i');
      i.className = 'ri-play-list-2-fill';
      a.append(i, v);
      fragment.appendChild(a);
    });
    return pls.length ? fragment : 'No Collections Found';
  }

  function loadSubList(type: string) {

    if (!Object(db).hasOwnProperty(type))
      return `No Subscribed ${type} Found`;

    const array = [];
    const pls = db[type] as { [index: string]: Record<'name' | 'uploader' | 'thumbnail' | 'id', string> };

    for (const pl in pls) {
      array.push(<StreamItem>{
        type: type.slice(0, -1),
        name: pls[pl].name,
        uploaderName: pls[pl].uploader,
        url: `/${type === 'channels' ? type.slice(0, -1) : type}/` + pls[pl].id,
        thumbnail: pls[pl].thumbnail
      });
    }
    return itemsLoader(array);
  }

  async function loadFeed() {
    if (!Object(db).hasOwnProperty('channels'))
      return 'You have not subscribed to any channels';

    loadingScreen.showModal();

    const channels = Object.keys(db.channels);
    const initApi = getApi('piped');
    const fetchItems = await fetch(initApi + '/feed/unauthenticated?channels=' + channels.join(','))
      .then(res => res.json())
      .catch(() => {
        notify(`${initApi} was not able to return the subscription feed. Retry with another instance.`);
      })
      .finally(() => loadingScreen.close());

    return itemsLoader(fetchItems);
  }


  const container = document.getElementById('superCollectionList') as HTMLDivElement;
  container.replaceChildren(
    name === 'featured' ?
      await loadFeaturedPls() :
      name === 'collections' ?
        loadUrPls() :
        name === 'feed' ?
          await loadFeed() :
          loadSubList(name)
  );
}

