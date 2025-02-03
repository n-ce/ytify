
// piped import playlists into ytify collections

import { addListToCollection, createCollection, superCollectionLoader } from "../lib/libraryUtils";
import { convertSStoHHMMSS, notify } from "../lib/utils";

export async function pipedPlaylistsImporter() {

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

        createCollection(listTitle);
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
}

