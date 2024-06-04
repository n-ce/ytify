import { audio, favButton, favIcon, superCollectionSelector } from "../lib/dom";
import { addListToCollection, addToCollection, createPlaylist, fetchCollection, getDB, removeFromCollection, reservedCollections, saveDB, superCollectionLoader, toCollection } from "../lib/libraryUtils";
import { $, convertSStoHHMMSS, fetchList, getSaved, notify, params, removeSaved, save } from "../lib/utils";



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

  superCollectionLoader(val as 'feed');
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



// piped import playlists into ytify collections

document.getElementById('pipedPlsImport')!.addEventListener('click', async () => {
  const instance = prompt('Enter the Piped Authentication Instance API URL :', 'https://pipedapi.kavin.rocks');
  if (!instance) return;

  const username = prompt('Enter Username :');
  if (!username) return;

  const password = prompt('Enter Password :');
  if (!password) return;

  // login 
  const authId = await fetch(instance + '/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .catch(e => notify(`Failed to Login, Error : ${e}`));

  if (!authId) {
    notify('No Auth Token Found! Aborted Login Process.');
    return;
  }

  notify('Succesfully logged in to account.');

  // fetch
  const playlists = await fetch(instance + '/user/playlists', {
    headers: {
      Authorization: authId.token
    }
  }).then(res => res.json())
    .catch(e => notify(`Failed to Find Playlists, Error : ${e}`));
  if (playlists.length)
    notify('Succesfully fetched playlists from account.')
  else return;


  // import

  await Promise.all(playlists.map((playlist: {
    id: string
  }) =>
    fetch(instance + '/playlists/' + playlist.id)
      .then(res => res.json())
      .then(data => {
        const listTitle = data.name;

        createPlaylist(listTitle);
        const list: { [index: string]: CollectionItem } = {};
        const streams = data.relatedStreams
        for (const i of streams)
          list[i.title] = {
            id: i.url.slice(9),
            title: i.title,
            author: i.uploaderName,
            duration: convertSStoHHMMSS(i.duration),
            channelUrl: i.uploaderUrl
          }
        addListToCollection(listTitle, list);
      })
  )).then(() => {
    notify('Succesfully imported playlists from your piped account into ytify as collections');
  })
    .catch(e => {
      notify('Could not successfully import all playlists, Error : ' + e);
    });


  // Refresh without reload
  superCollectionLoader('collections');

  // logout

  fetch(instance + '/logout', {
    method: 'POST',
    headers: {
      Authorization: authId.token
    }
  }).then(res => {
    notify(res.ok ?
      'Succesfully logged out of your piped account.' :
      'Couldn\'t logout successfully'
    );
  });

});
