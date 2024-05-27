import { render } from "solid-js/web";
import StreamItem from "../components/StreamItem";
import { audio, favButton, favIcon, listAnchor, listBtnsContainer, listContainer } from "../lib/dom";
import { addToCollection, createPlaylist, getDB, removeFromCollection, reservedCollections, saveDB, toCollection } from "../lib/libraryUtils";
import { $, fetchList, getSaved, hostResolver, itemsLoader, params, removeSaved, save } from "../lib/utils";



const importBtn = document.getElementById('upload') as HTMLInputElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const cleanBtn = document.getElementById('cleanLibraryBtn') as HTMLButtonElement;

importBtn.addEventListener('change', async () => {
  const newDB = JSON.parse(await (<FileList>importBtn.files)[0].text());
  const oldDB = getDB();
  if (!confirm('This will merge your current library with the imported library, continue?')) return;
  for (const collection in newDB) for (const item in newDB[collection])
    toCollection(collection, newDB[collection][item], oldDB)
  saveDB(oldDB);
  location.reload();
});


exportBtn.addEventListener('click', () => {
  const link = $('a');
  link.download = 'ytify_library.json';
  link.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(getDB(), undefined, 2))}`;
  link.click();
});

cleanBtn.addEventListener('click', () => {

  const library = document.getElementById('library') as HTMLDivElement;
  const libraryItems = library.getElementsByClassName('streamItem');

  if (!confirm('Are you sure you want to clear ' + libraryItems.length + ' items from the library?')) return;
  removeSaved('library');
  location.reload();
});


// setup initial dom state

addEventListener('DOMContentLoaded', () => {
  const initialData = getDB();

  const initialKeys = Object.keys(initialData);

  for (const key of initialKeys)
    if (!reservedCollections.includes(key)) {
      createPlaylist(key);
      continue;
    }
});



// favorites button & data

favButton.addEventListener('click', () => {
  const id = audio.dataset.id;
  if (!id) return;
  favButton.checked ?
    addToCollection('favorites', audio.dataset) :
    removeFromCollection('favorites', id);

  favIcon.classList.toggle('ri-heart-fill');
});


function fetchCollection(collection: string) {
  const db = getDB();
  const data = db[collection];

  const fragment = document.createDocumentFragment();

  for (const item in data) {
    const d = data[item];
    render(() => StreamItem({
      id: d.id || '',
      href: hostResolver(`/watch?v=${data[item].id}`),
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

  listContainer.replaceChildren(fragment);

  const isReversed = listContainer.classList.contains('reverse');

  if (reservedCollections.includes(collection)) {
    if (!isReversed)
      listContainer.classList.add('reverse');
  }
  else if (isReversed)
    listContainer.classList.remove('reverse');


  listBtnsContainer.className = listContainer.classList.contains('reverse') ? 'reserved' : 'collection';

  listAnchor.dataset.id = collection;

  listAnchor.click();
  listContainer.scrollTo(0, 0);
  history.replaceState({}, '',
    location.origin + location.pathname +
    '?collection=' + collection);
}



const collectionContainer = document.getElementById('collections')!;

collectionContainer.addEventListener('click', e => {
  e.preventDefault();
  const elm = e.target as HTMLAnchorElement;
  if (elm.classList.contains('collectionItem'))
    fetchCollection(elm.id);
});

if (params.has('collection'))
  fetchCollection(<string>params.get('collection'))


const superCollectionSelector = document.getElementById('superCollectionSelector') as HTMLSelectElement;
superCollectionSelector.addEventListener('change', () => {
  const val = superCollectionSelector.value;
  val === 'ytm_pls' ?
    removeSaved('defaultSuperCollection') :
    save('defaultSuperCollection', val);

  superCollectionLoader(val);
});


const sdsc = getSaved('defaultSuperCollection');
if (sdsc)
  superCollectionSelector.value = sdsc;


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

const superCollectionList = document.getElementById('superCollectionList')!;
superCollectionList.addEventListener('click', (e) => {
  e.preventDefault();

  const elm = e.target as HTMLAnchorElement;

  if (superCollectionSelector.value === 'ur_pls' && elm.textContent)
    fetchCollection(elm.textContent);
  if (elm.dataset.url)
    fetchList(elm.dataset.url)
});


function createCollectionItems(names: string[]) {
  const fragment = document.createDocumentFragment();
  names.forEach(v => {
    const a = $('a');
    a.href = '/list?collection=' + v;
    a.className = 'ur_pls_item';
    const i = $('i');
    i.className = 'ri-play-list-2-fill';
    a.append(i, v);
    fragment.appendChild(a);
  });

  return fragment;

}


async function superCollectionLoader(name: string) {

  const container = document.getElementById('superCollectionList') as HTMLDivElement;
  const db = getDB();
  const filterOut = reservedCollections.concat(['channels', 'playlists']);

  const keys = Object.keys(db).filter(v => !filterOut.includes(v));

  container.replaceChildren(
    name === 'ytm_pls' ?
      await loadFeaturedPls() :
      name === 'ur_pls' ?
        createCollectionItems(keys) : 'No items Found'
  );

}
superCollectionLoader(superCollectionSelector.value);
