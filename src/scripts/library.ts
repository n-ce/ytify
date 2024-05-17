import { render } from "solid-js/web";
import StreamItem from "../components/StreamItem";
import { audio, favButton, favIcon, listAnchor, listBtnsContainer, listContainer } from "../lib/dom";
import { addToCollection, createPlaylist, getDB, removeFromCollection, reservedCollections, saveDB, toCollection } from "../lib/libraryUtils";
import { $, getSaved, params, removeSaved } from "../lib/utils";



const importBtn = document.getElementById('upload') as HTMLInputElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const cleanBtn = document.getElementById('cleanLibraryBtn') as HTMLButtonElement;
const greeting = document.getElementById('greeting') as HTMLHeadingElement;
const hours = new Date().getHours();

greeting.textContent = 'Good ' + (hours < 12 ? 'Morning' : hours < 17 ? 'Afternoon' : 'Evening');


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

  const imgLoad = getSaved('img') ? false : true;
  const imgLoadStyle = getSaved('lazyImg') ? 'lazy' : 'eager';


  for (const item in data) {
    const d = data[item];
    render(() => StreamItem({
      id: d.id || '',
      href: `/watch?v=${data[item].id}`,
      title: d.title || '',
      author: d.author || '',
      duration: d.duration || '',
      channelUrl: d.channelUrl || '',
      imgLoad: imgLoad,
      imgLoadStyle: imgLoadStyle
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
  history.replaceState({}, '',
    location.origin + location.pathname +
    '?collection=' + collection);
}


const collections = <HTMLSpanElement>document.getElementById('collections');

collections.addEventListener('click', e => {
  e.preventDefault();
  console.log(e);

  const elm = e.target as HTMLParagraphElement;
  if (!elm.classList.contains('collectionItem')) return;

  const id = elm.id;
  fetchCollection(id);
});

if (params.has('collection'))
  fetchCollection(<string>params.get('collection'))
