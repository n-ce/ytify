import './stylesheets/global.css';
import './scripts/router';
import './scripts/theme';
import './scripts/api';
import './scripts/search';
import './scripts/queue';
import './scripts/list';
import './scripts/audioEvents';
import './scripts/miniPlayer';
import './scripts/library';
import type { SortableEvent } from "sortablejs";
import player from './lib/player';
import { render } from 'solid-js/web';
import { getSaved, params, store } from './store';
import { getApi, idFromURL, notify } from './lib/utils';
import { createPlaylist, fetchCollection, getDB, reservedCollections } from './lib/libraryUtils';
import { bitrateSelector, instanceSelector, searchFilters, superInput, actionsMenu, audio, playButton, queuelist, loadingScreen, ytifyIcon } from './lib/dom';
import fetchList from './scripts/fetchList';

async function main() {
  /*
  instance selector is a vital part which
  should be available as quickly as possible,
  - so we render it in html (this is when instances are loaded)
  - extract it from DOM
  - fit it into the settings component
  */

  const settingsContainer = document.getElementById('settings') as HTMLDivElement;

  await import('./components/Settings')
    .then(mod => render(mod.default, settingsContainer));
  // render appends Settings after act so we append act after Settings
  settingsContainer.appendChild(document.getElementById('actionsContainer')!);
  // insert the instance selector inside the component area
  document.getElementById('instanceSelectorContainer')!.appendChild(instanceSelector);

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



  if (import.meta.env.PROD)
    await import('virtual:pwa-register').then(pwa => {
      const handleUpdate = pwa.registerSW({
        onNeedRefresh() {
          import('./components/UpdatePrompt').then(mod =>
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

          if (d.details !== 'manifestLoadError') return;

          const apiIndex = instanceSelector.selectedIndex;
          const apiUrl = getApi('piped', apiIndex);
          if (apiIndex < instanceSelector.length - 1) {
            const nextApi = getApi('piped', apiIndex + 1)
            notify(`switched instance from ${apiUrl} to ${nextApi} due to HLS manifest loading error.`);
            instanceSelector.selectedIndex++;
            h.loadSource((<string>d.url).replace(apiUrl, nextApi));
            return;
          }
          notify(e);
          playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
          instanceSelector.selectedIndex = 1;
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

  await import('./components/ActionsMenu')
    .then(mod => render(mod.default, actionsMenu));


  // playlist selector to create playlist

  const initialKeys = Object.keys(getDB());

  for (const key of initialKeys)
    if (!reservedCollections.includes(key))
      createPlaylist(key);


  // list loading

  if (params.has('channel') || params.has('playlists'))
    fetchList('/' +
      location.search
        .substring(1)
        .split('=')
        .join('/')
    );



}

addEventListener('DOMContentLoaded', main);
