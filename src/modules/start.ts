import { type SortableEvent } from 'sortablejs';
import player from '../lib/player';
import { getSaved, params, store } from '../lib/store';
import { $, getDownloadLink, idFromURL, notify, proxyHandler } from '../lib/utils';
import { bitrateSelector, searchFilters, superInput, audio, loadingScreen, ytifyIcon, queuelist } from '../lib/dom';
import fetchList from '../modules/fetchList';
import { fetchCollection, fetchSuperMix } from "../lib/libraryUtils";

export default async function() {

  const custom_instance = getSaved('custom_instance_2');

  if (custom_instance) {

    const [pi, iv] = custom_instance.split(',');
    store.api.piped[0] = pi;
    store.api.invidious[0] = iv;

  } else if ('inject_ytify_services' in window) await window.inject_ytify_services(store);

  // hls

  if (getSaved('HLS')) {
    // handling bitrates with HLS will increase complexity, better to detach from DOM
    bitrateSelector.remove();

    if (!store.player.legacy)
      import('hls.js')
        .then(mod => {
          store.player.HLS = new mod.default();
          const h = store.player.HLS;
          h.attachMedia(audio);
          h.on(mod.default.Events.MANIFEST_PARSED, () => {
            h.currentLevel = store.player.hq ?
              h.levels.findIndex(l => l.audioCodec === 'mp4a.40.2') : 0;
            audio.play();
          });
          h.on(mod.default.Events.ERROR, (_, d) => {

            if (d.details === 'manifestLoadError') {
              const hlsUrl = store.player.data!.hls;
              const piProxy = (new URL(hlsUrl)).origin;

              if (piProxy === store.api.invidious[0]) {
                notify(d.details);
                return;
              }
              const newUrl = hlsUrl.replace(piProxy, store.api.invidious[0]);
              h.loadSource(newUrl);
            }
            else {
              notify('load error, retrying...')
              player(store.stream.id);
            }

          })
        })
  }
  else bitrateSelector.addEventListener('change', async () => {
    if (store.player.playbackState === 'playing')
      audio.pause();
    const timeOfSwitch = audio.currentTime;
    audio.src = await proxyHandler(bitrateSelector.value);
    audio.currentTime = timeOfSwitch;
    audio.play();
  });



  // params handling

  const isPWA = idFromURL(params.get('url') || params.get('text'));
  const id = params.get('s') || isPWA;
  let shareAction = getSaved('shareAction');
  if (isPWA && shareAction === 'ask')
    shareAction = confirm('Click ok to Play, click cancel to Download') ?
      '' : 'dl';



  if (id) {
    loadingScreen.showModal();
    if (isPWA && shareAction) {
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
  else document.getElementById('ytifyIconContainer')?.prepend(ytifyIcon);

  if (params.has('q')) {
    superInput.value = params.get('q') || '';
    if (params.has('f'))
      searchFilters.value = params.get('f') || '';
    superInput.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
  }

  const collection = params.get('collection');
  const shared = params.get('si');
  const supermix = params.get('supermix');

  fetchCollection(collection || shared, Boolean(shared));
  if (supermix)
    fetchSuperMix(supermix);

  // list loading

  if (params.has('channel') || params.has('playlists'))
    fetchList('/' +
      location.search
        .substring(1)
        .split('=')
        .join('/')
    );

  if (location.origin === 'https://ytify.netlify.app')
    alert('Users are requested to migrate to ytify.us.kg before Feb 2025.');



  // queue sorting

  await import('sortablejs')
    .then(mod =>
      new mod.default(queuelist, {
        handle: '.ri-draggable',
        onUpdate(e: SortableEvent) {
          if (e.oldIndex == null || e.newIndex == null) return;
          const queueArray = store.queue;
          queueArray.splice(e.newIndex, 0, queueArray.splice(e.oldIndex, 1)[0]);
        }
      })
    );


}
