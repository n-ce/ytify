import { favButton, favIcon, superCollectionSelector } from "../lib/dom";
import { addToCollection, fetchCollection, getDB, removeFromCollection, saveDB, superCollectionLoader, toCollection } from "../lib/libraryUtils";
import { $, removeSaved, save, superClick } from "../lib/utils";
import { getSaved, store } from "../lib/store";

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

  if (confirm(`Are you sure you want to clear ${Object.values(getDB()).reduce((acc, collection) => acc + Object.keys(collection).length, 0)} items from the library?`)) {
    removeSaved('library');
    location.reload();
  }
});





// favorites button & data

favButton.addEventListener('click', () => {
  if (!store.stream.id) return;
  favButton.checked ?
    addToCollection('favorites', store.stream) :
    removeFromCollection('favorites', store.stream.id);

  favIcon.classList.toggle('ri-heart-fill');
});






collectionContainer.addEventListener('click', e => {
  e.preventDefault();
  const elm = e.target as HTMLAnchorElement;
  if (elm.classList.contains('collectionItem'))
    fetchCollection(elm.id);
});


superCollectionSelector.addEventListener('click', e => {

  const elm = e.target as HTMLInputElement & { value: SuperCollection };
  if (!elm.value) return;

  if (elm.value !== 'for_you') {
    elm.value === 'featured' ?
      removeSaved('defaultSuperCollection') :
      save('defaultSuperCollection', elm.value);
  }
  superCollectionLoader(elm.value);
});


const sdsc = getSaved('defaultSuperCollection');
if (sdsc)
  document.getElementById('r.' + sdsc)?.toggleAttribute('checked');


superCollectionList.addEventListener('click', superClick);



