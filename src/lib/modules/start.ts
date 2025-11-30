import { params, setNavStore, setStore, setPlayerStore, getList, setSearchStore, playerStore } from '@lib/stores';
import { config, getDownloadLink, idFromURL, fetchCollection, player, setConfig } from '@lib/utils';



export default async function() {

  if (!params.size)
    setNavStore('home', 'state', true);

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



  function decode(compressedString: string): string {
    let decompressedString = compressedString;
    const decodePairs = {
      '$': 'invidious',
      '&': 'inv',
      '#': 'iv',
      '~': 'com'
    }

    for (const code in decodePairs) {
      const safeCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeCode, 'g');
      decompressedString = decompressedString.replace(regex, decodePairs[code as keyof typeof decodePairs]);
    }
    return decompressedString;
  }

  await fetch('https://raw.githubusercontent.com/n-ce/Uma/main/iv.txt')
    .then(res => res.text())
    .then(decode)
    .then(data => {
      setStore({
        invidious: data.split(',').map(i => `https://${i}`),
        index: 0
      })
    })
    .catch(() => {
      setStore('snackbar', '⚠️  Failed to Fetch Instances from Uma');
    });

  const collection = params.get('collection');
  const shared = params.get('si');
  const channel = params.get('channel');
  const playlist = params.get('playlist');

  if (collection || shared)
    fetchCollection(collection || shared, Boolean(shared));
  else if (channel)
    getList(channel, 'channel')
  else if (playlist)
    getList(playlist, 'playlist')

  const q = params.get('q');
  if (q) {
    const f = params.get('f') || 'all';
    setConfig('searchFilter', f);
    setSearchStore('query', q);
  }


  const isPWA = idFromURL(params.get('url') || params.get('text'));
  const id = params.get('s') || isPWA;

  if (id) {
    if (isPWA && shareAction === 'watch') {
      setPlayerStore('stream', 'id', id);
      setPlayerStore('isWatching', true);


    } else if (isPWA && shareAction === 'download') {
      getDownloadLink(id);
    } else {
      if (params.size === 1)
        setNavStore('player', 'state', true);
      await player(id);
      const t = params.get('t');
      if (t) {
        playerStore.audio.currentTime = Number(t);
        setPlayerStore('currentTime', Number(t));
      }
    }

  }





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
