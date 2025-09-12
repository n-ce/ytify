import { navStore, params, setNavStore, t, setStore, setPlayerStore, setSearchStore } from '../stores';
import { config, setConfig, getDownloadLink, idFromURL, fetchCollection, uma, player } from '../utils';


export default async function() {


  const { shareAction } = config;

  await uma()
    .then(({ piped, invidious, hyperpipe, jiosaavn, cobalt, status }) => {
      setStore('api', {
        piped, invidious, hyperpipe, jiosaavn, cobalt, status,
        index: { piped: 0, invidious: 0, hyperpipe: 0 }
      })
    })
    .catch(() => {
      setStore('snackbar', '⚠️  Failed to Fetch Instances from Uma');
    });


  const q = params.get('q');

  if (q) {
    if (!navStore.search.state)
      setNavStore('search', 'state', true);
    const f = params.get('f') || 'all';
    setConfig('searchFilter', f);

    setSearchStore('query', q);

  }


  const isPWA = idFromURL(params.get('url') || params.get('text'));
  const id = params.get('s') || isPWA;

  if (id) {
    if (isPWA && shareAction === 'watch') {
      setPlayerStore('stream', 'id', id);
      setNavStore('video', 'state', true);


    } else if (isPWA && shareAction === 'download') {
      setStore('snackbar', t('actions_menu_download_init'))
      const a = document.createElement('a');
      const l = await getDownloadLink(id);
      if (l) {
        a.href = l;
        a.click();
      }
    } else {
      if (params.size === 1)
        setNavStore('player', 'state', true);
      await player(id);
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
          setStore('updater', handleUpdate);
          setNavStore('updater', 'state', true)
        }
      });
    });

}
