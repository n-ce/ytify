import player from '../lib/player';
import { getSaved, params, store } from '../lib/store';
import { $, getDownloadLink, idFromURL, proxyHandler } from '../lib/utils';
import { bitrateSelector, searchFilters, superInput, audio, loadingScreen, searchlist } from '../lib/dom';
import fetchList from '../modules/fetchList';
import { fetchCollection } from "../lib/libraryUtils";
import { i18n } from '../scripts/i18n.ts';
import '../scripts/library';
import '../scripts/queue';

export default async function() {

  const custom_instance = getSaved('custom_instance');

  if (custom_instance) {

    const [pi, iv, useInvidious] = custom_instance.split(',');
    store.player.hls.api[0] =
      store.api.piped[0] = pi;
    store.api.invidious[0] = iv;
    store.player.usePiped = !useInvidious;

  } else await fetch('https://raw.githubusercontent.com/n-ce/Uma/main/dynamic_instances.json')
    .then(res => res.json())
    .then(data => {
      store.api.piped = data.piped;
      store.api.invidious = data.invidious;
      store.api.hyperpipe = data.hyperpipe;
      store.player.hls.api = data.hls;
      store.player.usePiped = data.status === 1;
      store.player.fallback = location.origin;
    });


  if (store.player.hls.on) {
    // handling bitrates with HLS will increase complexity, better to detach from DOM
    bitrateSelector.remove();
    if (store.player.legacy) return;
    (await import('./hls')).default();
  }

  else bitrateSelector.addEventListener('change', async () => {
    if (store.player.playbackState === 'playing')
      audio.pause();
    const timeOfSwitch = audio.currentTime;
    audio.src = proxyHandler(bitrateSelector.value);
    audio.currentTime = timeOfSwitch;
    audio.play();
  });

  // codec handling

  const codecSaved = getSaved('codec') as 'opus';
  store.player.codec = codecSaved ||
    ((await store.player.supportsOpus) ? 'opus' : 'aac');

  const savedDownloadFormat = getSaved('dlFormat');
  if (savedDownloadFormat)
    store.downloadFormat = savedDownloadFormat as 'opus';

  // params handling

  const isPWA = idFromURL(params.get('url') || params.get('text'));
  const id = params.get('s') || isPWA;
  let shareAction = getSaved('shareAction');
  if (isPWA && shareAction === 'ask')
    shareAction = confirm(i18n('pwa_share_prompt')) ?
      '' : 'dl';

  if (id) {
    loadingScreen.showModal();
    if (isPWA && shareAction === 'watch') {
      store.actionsMenu.id = id;
      const dialog = $('dialog') as HTMLDialogElement;
      dialog.open = true;
      dialog.className = 'watcher';
      document.body.appendChild(dialog);
      import('../components/WatchVideo.ts')
        .then(mod => mod.default(dialog));
    }
    else if (isPWA && shareAction) {
      const a = $('a');
      const l = await getDownloadLink(store.actionsMenu.id);
      if (l) {
        a.href = l;
        a.click();
      }
    }
    else await player(id)

    loadingScreen.close();
  }
  if (params.has('q')) {
    superInput.value = params.get('q') || '';
    if (params.has('f'))
      searchFilters.value = params.get('f') || '';
    superInput.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
  }
  else fetch(location.origin + '/landing')
    .then(_ => _.text())
    .then(_ => searchlist.innerHTML = _.startsWith('<!') ? '' : _);



  const collection = params.get('collection');
  const shared = params.get('si');
  const supermix = params.get('supermix');

  fetchCollection(collection || shared, Boolean(shared));
  if (supermix)
    import('./supermix').then(mod => mod.default(supermix.split(' ')));

  // list loading

  if (params.has('channel') || params.has('playlists'))
    fetchList('/' +
      location.search
        .substring(1)
        .split('=')
        .join('/')
    );

}
