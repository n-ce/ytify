import { params, setNavStore, setStore, setPlayerStore } from '@lib/stores';
import { config, getDownloadLink, idFromURL, fetchCollection, player } from '@lib/utils';



export default async function() {

  // Handle /s/:id URLs by transforming them to /?s=id internally
  const pathParts = location.pathname.split('/');
  if (pathParts.length === 3 && pathParts[1] === 's') {
    const id = pathParts[2];
    if (id) {
      params.set('s', id);
      history.replaceState({}, '', `/?s=${id}`);
    }
  }

  const { shareAction } = config;

  await fetch('https://raw.githubusercontent.com/n-ce/Uma/main/iv.txt')
    .then(res => res.text())
    .then(data => {
      setStore({
        invidious: data.split(',').map(i => `https://${i}`),
        index: 0
      })
    })
    .catch(() => {
      setStore('snackbar', '⚠️  Failed to Fetch Instances from Uma');
    });



  const isPWA = idFromURL(params.get('url') || params.get('text'));
  const id = params.get('s') || isPWA;

  if (id) {
    if (isPWA && shareAction === 'watch') {
      setPlayerStore('stream', 'id', id);
      setNavStore('video', 'state', true);


    } else if (isPWA && shareAction === 'download') {
      getDownloadLink(id);
    } else {
      if (params.size === 1)
        setNavStore('player', 'state', true);
      await player(id);
      const t = params.get('t');
      setPlayerStore('currentTime', Number(t));
    }

  }


  const collection = params.get('collection');
  const shared = params.get('si');
  const supermix = params.get('supermix');

  fetchCollection(collection || shared, Boolean(shared));
  if (supermix)
    import('./supermix')
      .then(_ => _.default(supermix.split(' ')));

  // list loading
  /*
    if (params.has('channel') || params.has('playlists'))
      fetchList('/' +
        location.search
          .substring(1)
          .split('=')
          .join('/')
      );
    */


  document.addEventListener('click', (e) => {

    const detail = document.querySelector('details:open');
    if (!detail?.firstElementChild?.contains(e.target as HTMLElement))
      detail?.removeAttribute('open');
  });


  if (import.meta.env.PROD)
    await import('virtual:pwa-register').then(pwa => {

      const handleUpdate = pwa.registerSW({
        onNeedRefresh() {
          setStore({ updater: handleUpdate });
          setNavStore('updater', 'state', true)
        }
      });
    });

}
