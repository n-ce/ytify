import { audio, favButton, favIcon, superCollectionSelector } from "../lib/dom";
import { addToCollection, createPlaylist, fetchCollection, getDB, removeFromCollection, reservedCollections, saveDB, superCollectionLoader, toCollection } from "../lib/libraryUtils";
import { $, fetchList, getSaved, params, removeSaved, save } from "../lib/utils";



const importBtn = document.getElementById('upload') as HTMLInputElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const cleanBtn = document.getElementById('cleanLibraryBtn') as HTMLButtonElement;
const collectionContainer = document.getElementById('collections') as HTMLDivElement;
const superCollectionList = document.getElementById('superCollectionList')!;

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

  let items = 0;
  const db = getDB();
  for (const collection in db) {
    const collx = db[collection];
    for (const _ in collx)
      items++;
  }
  if (!confirm('Are you sure you want to clear ' + items + ' items from the library?')) return;
  removeSaved('library');
  location.reload();
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






collectionContainer.addEventListener('click', e => {
  e.preventDefault();
  const elm = e.target as HTMLAnchorElement;
  if (elm.classList.contains('collectionItem'))
    fetchCollection(elm.id);
});

if (params.has('collection'))
  fetchCollection(<string>params.get('collection'))


superCollectionSelector.addEventListener('change', () => {
  const val = superCollectionSelector.value;
  val === 'collections' ?
    removeSaved('defaultSuperCollection') :
    save('defaultSuperCollection', val);

  superCollectionLoader(val);
});


const sdsc = getSaved('defaultSuperCollection');
if (sdsc)
  superCollectionSelector.value = sdsc;


superCollectionList.addEventListener('click', (e) => {
  e.preventDefault();

  const elm = e.target as HTMLAnchorElement;

  if (superCollectionSelector.value === 'collections' && elm.textContent)
    fetchCollection(elm.textContent);
  if (elm.dataset.url)
    fetchList(elm.dataset.url)
});


// setup initial dom state

addEventListener('DOMContentLoaded', () => {

  const initialKeys = Object.keys(getDB());

  for (const key of initialKeys)
    if (!reservedCollections.includes(key))
      createPlaylist(key);

});
