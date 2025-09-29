import { setStore, t } from '@lib/stores';
import { addListToCollection, convertSStoHHMMSS, createCollection } from '@lib/utils';

export default async function() {

  const instance = prompt(t('piped_enter_auth'), 'https://pipedapi.kavin.rocks');
  if (!instance) return;

  const username = prompt(t('piped_enter_username'));
  if (!username) return;

  const password = prompt(t('piped_enter_password'));
  if (!password) return;

  // login 
  const authId = await fetch(instance + '/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .catch(e => setStore('snackbar', t("piped_failed_login", e)));

  if (!authId) {
    setStore('snackbar', t("piped_failed_token"));
    return;
  }

  setStore('snackbar', t("piped_success_logged"));

  // fetch
  const playlists = await fetch(instance + '/user/playlists', {
    headers: {
      Authorization: authId.token
    }
  }).then(res => res.json())
    .catch(e => setStore('snackbar', t("piped_failed_find", e)));
  if (playlists.length)
    setStore('snackbar', t("piped_success_fetched"));
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
    setStore('snackbar', t('piped_success_imported'));
    document.getElementById('r.collections')?.click();
  })
    .catch(e => {
      setStore('snackbar', t("piped_failed_imported", e));
    });

  // logout

  fetch(instance + '/logout', {
    method: 'POST',
    headers: {
      Authorization: authId.token
    }
  }).then(res => {
    setStore('snackbar', t(
      res.ok ?
        'piped_success_auth' :
        'piped_failed_auth'
    ));
  });
}


