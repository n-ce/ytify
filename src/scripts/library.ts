import { favButton, favIcon } from "../lib/dom";
import { addToCollection, fetchCollection, getDB, removeFromCollection, saveDB, toCollection } from "../lib/libraryUtils";
import { $, i18n, notify, removeSaved } from "../lib/utils";
import { getSaved, store } from "../lib/store";

const importBtn = document.getElementById('upload') as HTMLInputElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const cleanBtn = document.getElementById('cleanLibraryBtn') as HTMLButtonElement;
const collectionContainer = document.getElementById('collections') as HTMLDivElement;

importBtn.addEventListener('change', async () => {
  const newDB = JSON.parse(await (<FileList>importBtn.files)[0].text());
  const oldDB = getDB();
  if (!confirm(i18n('library_import_prompt'))) return;
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
  const count = Object.values(getDB()).reduce((acc, collection) => acc + Object.keys(collection).length, 0);
  if (confirm(i18n('library_clean_prompt', count.toString()))) {
    removeSaved('library');
    location.reload();
  }
});

// favorites button & data

favButton.addEventListener('click', () => {
  if (!store.stream.id) return;

  if (favButton.checked)
    addToCollection('favorites', store.stream)
  else
    removeFromCollection('favorites', store.stream.id);

  favIcon.classList.toggle('ri-heart-fill');
});


collectionContainer.addEventListener('click', e => {
  e.preventDefault();
  const elm = e.target as HTMLAnchorElement;
  if (elm.classList.contains('collectionItem'))
    fetchCollection(elm.id);
});

const dbhash = getSaved('dbsync');
const hashpoint = location.origin + '/dbs/' + dbhash;

if (dbhash) {
  if (Object.keys(getDB()).length) {
    fetch(hashpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: getSaved('library'),
    })
      .then(res => res.ok)
      .then(() => {
        notify('Library has been synced');
      })
      .catch(() => {
        notify('Failed to sync library');
      })
  }
  else {
    if (confirm('Do you want to import your library from your account?')) {
      fetch(hashpoint)
        .then(res => res.json())
        .then(saveDB)
        .catch(() => notify('No Data Found!'));
    }
  }
}
