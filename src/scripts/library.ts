import { audio, favButton, favIcon } from "../lib/dom";
import { addListToCollection, addToCollection, createPlaylist, getCollection, getDB, removeFromCollection, reservedCollections, saveDB, toCollection } from "../lib/libraryUtils";
import { $, removeSaved, superClick } from "../lib/utils";
import { listToQ } from "./queue";


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
  const libraryItems = library.getElementsByTagName('stream-item');

  if (!confirm('Are you sure you want to clear ' + libraryItems.length + ' items from the library?')) return;
  removeSaved('library');
  location.reload();
});


// setup initial dom state

function loadLibrary() {
  const initialData = getDB();

  const initialKeys = Object.keys(initialData);

  for (const key of initialKeys) {
    if (!reservedCollections.includes(key)) {
      createPlaylist(key);
      continue;
    }
    const container = getCollection(key);
    const [clearBtn, removeBtn, enqueueBtn] = (<HTMLDetailsElement>container.parentElement).querySelectorAll('button');

    container.addEventListener('click', superClick);

    clearBtn.addEventListener('click', () => {
      const db = getDB();
      delete db[key];
      saveDB(db);
      container.innerHTML = '';
    })
    removeBtn.addEventListener('click', () => {
      container.querySelectorAll('stream-item').forEach(e => e.classList.toggle('delete'));
      removeBtn.classList.toggle('delete');
    })

    if (key === 'favorites')
      enqueueBtn.onclick = () => listToQ(container);
  }

  for (const collection in initialData)
    addListToCollection(collection, initialData[collection], initialData);
}

location.pathname === '/library' ?
  addEventListener('DOMContentLoaded', loadLibrary) :
  setTimeout(loadLibrary, 1500);


// favorites button & data

favButton.addEventListener('click', () => {
  const id = audio.dataset.id;
  if (!id) return;
  favButton.checked ?
    addToCollection('favorites', audio.dataset) :
    removeFromCollection('favorites', id);

  favIcon.classList.toggle('ri-heart-fill');
});

