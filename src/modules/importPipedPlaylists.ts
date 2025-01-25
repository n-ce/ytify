
// piped import playlists into ytify collections

import { addListToCollection, createCollection, superCollectionLoader } from "../lib/libraryUtils";
import { convertSStoHHMMSS, notify } from "../lib/utils";
import {i18n} from "../scripts/i18n.ts";

export async function pipedPlaylistsImporter() {

  const instance = prompt(i18n._('piped_enter_auth'), 'https://pipedapi.kavin.rocks');
  if (!instance) return;

  const username = prompt(i18n._('piped_enter_username'));
  if (!username) return;

  const password = prompt(i18n._('piped_enter_password'));
  if (!password) return;

  // login 
  const authId = await fetch(instance + '/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .catch(e => notify(i18n._("piped_failed_login", { e })));

  if (!authId) {
    notify(i18n._("piped_failed_token"));
    return;
  }

  notify(i18n._("piped_success_logged"));

  // fetch
  const playlists = await fetch(instance + '/user/playlists', {
    headers: {
      Authorization: authId.token
    }
  }).then(res => res.json())
    .catch(e => notify( i18n._("piped_failed_find", { e })));
  if (playlists.length)
    notify(i18n._("piped_success_fetched"))
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
    notify(i18n._('piped_success_imported'));
  })
    .catch(e => {
      notify(i18n._("piped_failed_imported", { e }));
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
        i18n._('piped_success_auth') :
        i18n._('piped_failed_auth')
    );
  });
}


