import { getSaved, notify, save } from "./utils";
import { atpSelector } from "../scripts/superModal";
import StreamItem from "../components/StreamItem";
import { render } from "solid-js/web";
import { listContainer } from "./dom";



const library = document.getElementById('library') as HTMLDivElement;
export const reservedCollections = ['discover', 'history', 'favorites', 'listenLater'];

export const getDB = (): Library => JSON.parse(getSaved('library') || '{"discover":{}}');

export const saveDB = (data: Library) => save('library', JSON.stringify(data));

export const getCollection = (name: string) => <HTMLDivElement>(<HTMLDetailsElement>document.getElementById(name)).lastElementChild;

export function createCollectionItem(data: CollectionItem | DOMStringMap) {
  const fragment = document.createDocumentFragment();

  render(
    () => StreamItem({
      id: data.id || '',
      href: `/watch?v=${data.id}`,
      title: data.title || '',
      author: data.author || '',
      duration: data.duration || '',
      channelUrl: data.channelUrl || ''
    }),
    fragment);
  return fragment;
}

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

  if (!reservedCollections.includes(collection))
    return;

  if (collection === 'discover')
    db.discover = {};

  for (const key in list) {
    const data = list[key];
    toCollection(collection, data, db);
  }
  saveDB(db);
}

export function createPlaylist(title: string) {

  if (library.contains(document.getElementById(title)))
    return notify('This Playlist Already Exists!');


  atpSelector.add(new Option(title, title));
}
