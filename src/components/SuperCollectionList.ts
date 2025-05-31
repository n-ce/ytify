
import { getDB, reservedCollections, saveDB } from '../lib/libraryUtils';
import { superCollectionSelector, superCollectionList } from '../lib/dom';
import { superClick } from '../lib/utils';
import ItemsLoader from './ItemsLoader';
import { render } from 'uhtml';
import { setState, state } from '../lib/store';


let name = state.defaultSuperCollection as SuperCollection;

if (name)
  document.getElementById('r.' + name)?.toggleAttribute('checked')
else name = 'featured';

superCollectionList.addEventListener('click', superClick);

addEventListener('dbchange', (e) => {
  const { db, change } = e.detail;
  if (change) saveDB(db);
  main();
});

superCollectionSelector.addEventListener('click', e => {

  const elm = e.target as HTMLInputElement & { value: SuperCollection };

  if (!elm.value) return;

  if (elm.value !== 'for_you')
    setState('defaultSuperCollection', elm.value);

  name = elm.value;
  main();
});

export default async function main() {
  const db = getDB();
  const data = await loadData(name, db);
  const template = ItemsLoader(data as string);
  render(superCollectionList, template);
}

async function loadData(name: string, db: Library) {
  switch (name) {
    case 'featured':
      return loadFeaturedPls();
    case 'collections':
      return loadCollections(db);
    case 'feed':
      return loadFeed(db);
    case 'for_you':
      return loadForYou(db);
    default:
      return loadSubList(db, name as APAC);
  }
}

function loadForYou(db: Library) {
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


function loadCollections(db: Library) {
  const keys = Object.keys(db);
  return (keys.length ?
    keys : reservedCollections)
    .filter(v => v !== 'channels' && v !== 'playlists')
    .map(v => ({ type: 'collection', name: v }));


}

// APAC : artists | playlists | albums | channels
// albums are special playlists, id start with OLAK5uy & start with 'Album - ' naturally.
// artists are special channels which have been manually prepended with 'Artist - ' title.

function loadSubList(db: Library, flag: APAC) {
  const error = `No ${flag} in Library`;
  let type = flag;
  let len = 0;

  if (flag === 'albums') {
    type = 'playlists';
    len = 8;
  }
  if (flag === 'artists') {
    type = 'channels';
    len = 9;
  }

  const special = type === 'playlists' ? 'Album' : 'Artist';

  if (!Object(db).hasOwnProperty(type))
    return error;

  const array = [];
  const pls = db[type] as { [index: string]: Record<'name' | 'uploader' | 'thumbnail' | 'id', string> };

  for (const pl in pls) {
    const name = pls[pl].name;

    if (flag !== type) {
      if (!name.startsWith(special))
        continue;
    }
    else if (name.startsWith(special))
      continue;

    array.push({
      type: type.slice(0, -1),
      name: name.slice(len),
      uploaderName: pls[pl].uploader,
      url: `/${type === 'channels' ? type.slice(0, -1) : type}/` + pls[pl].id,
      thumbnail: pls[pl].thumbnail
    });
  }

  return array.length ? array : error;
}

const loadFeed = (db: Library) =>
  'channels' in db ?
    import('../modules/subfeedGenerator')
      .then(mod => mod.default(
        Object.values(db.channels)
          .filter(c => !c.name.startsWith('Artist -'))
          .map(c => c.id)
      )) :
    'You have not subscribed to any channels';


const loadFeaturedPls = () => fetch('https://raw.githubusercontent.com/wiki/n-ce/ytify/ytm_pls.md')
  .then(res => res.text())
  .then(text => text.split('\n'))
  .then(data => {
    const array = [];
    for (let i = 0; i < data.length; i += 4)
      array.push({
        'type': 'playlist',
        'name': data[i + 1],
        'uploaderName': '',
        'url': '/playlist?list=' + data[i + 2],
        'thumbnail': '/' + data[i + 3]
      });
    return array;
  });
