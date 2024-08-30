import type { SortableEvent } from "sortablejs";
import player from '../lib/player';
import { render } from 'solid-js/web';
import { getSaved, params, store } from '../store';
import { errorHandler, getApi, idFromURL } from '../lib/utils';
import { createPlaylist, fetchCollection, getDB, reservedCollections } from '../lib/libraryUtils';
import { bitrateSelector, searchFilters, superInput, actionsMenu, audio, playButton, queuelist, loadingScreen, ytifyIcon } from '../lib/dom';
import fetchList from '../scripts/fetchList';


if (import.meta.env.PROD)
  await import('virtual:pwa-register').then(pwa => {
    const handleUpdate = pwa.registerSW({
      onNeedRefresh() {
        import('../components/UpdatePrompt').then(mod =>
          render(() => mod.default(handleUpdate),
            document.body
          ));
      }
    });
  });



// hls

if (getSaved('HLS')) {
  // handling bitrates with HLS will increase complexity, better to detach from DOM
  bitrateSelector.remove();

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
      h.on(mod.default.Events.ERROR, (e, d) => {
        console.log(e);

        if (d.details !== 'manifestLoadError') return;
        const prevApi = getApi('piped');
        errorHandler(
          'HLS Manifest Loading Error',
          () => h.loadSource((d.url!).replace(prevApi, getApi('piped'))),
          () => playButton.classList.replace(playButton.className, 'ri-stop-circle-fill'),
          'piped'
        );

      })
    })
}
else bitrateSelector.addEventListener('change', () => {
  if (store.player.playbackState === 'playing')
    audio.pause();
  const timeOfSwitch = audio.currentTime;
  audio.src = bitrateSelector.value;
  audio.currentTime = timeOfSwitch;
  audio.play();
});



// queue sorting

await import('sortablejs')
  .then(mod =>
    new mod.default(queuelist, {
      handle: '.ri-draggable',
      onUpdate(e: SortableEvent) {
        if (e.oldIndex == null || e.newIndex == null) return;
        const queueArray = store.queue.array;
        queueArray.splice(e.newIndex, 0, queueArray.splice(e.oldIndex, 1)[0]);
      }
    })
  );


// Actions Menu has playlist selector

await import('../components/ActionsMenu')
  .then(mod => render(mod.default, actionsMenu));


// playlist selector to create playlist

const initialKeys = Object.keys(getDB());

for (const key of initialKeys)
  if (!reservedCollections.includes(key))
    createPlaylist(key);


// params handling

const id = params.get('s') || idFromURL(params.get('url') || params.get('text'));

if (id) {
  loadingScreen.showModal();
  await player(id);
  loadingScreen.close();
}
else document.getElementById('ytifyIconContainer')?.prepend(ytifyIcon);

if (params.has('q')) {
  superInput.value = params.get('q') || '';
  if (params.has('f'))
    searchFilters.value = params.get('f') || '';
  superInput.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
}

if (params.has('collection') || params.has('si'))
  fetchCollection(params.get('collection'), params.get('si'));

// list loading

if (params.has('channel') || params.has('playlists'))
  fetchList('/' +
    location.search
      .substring(1)
      .split('=')
      .join('/')
  );



