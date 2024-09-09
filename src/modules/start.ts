import { type SortableEvent } from 'sortablejs';
import player from '../lib/player';
import { getSaved, params, store } from '../lib/store';
import { idFromURL, notify } from '../lib/utils';
import { bitrateSelector, searchFilters, superInput, audio, loadingScreen, ytifyIcon, queuelist } from '../lib/dom';
import fetchList from '../modules/fetchList';
import { fetchCollection } from "../lib/libraryUtils";

export default async function() {

  const custom_instance = getSaved('custom_instance');
  const l = store.api.list;

  custom_instance ?
    l.push(custom_instance) :
    await fetch('https://raw.githubusercontent.com/n-ce/Uma/main/piped_instances.txt')
      .then(res => res.text())
      .then(list => list.split('\n'))
      .then(instances => instances.forEach(i => l.push(i)))
      .catch(() => l.push('https://pipedapi.kavin.rocks'));




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
        h.on(mod.default.Events.ERROR, (_, d) => {
          if (d.details !== 'manifestLoadError') return;
          notify(d.details);

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
          const queueArray = store.queue;
          queueArray.splice(e.newIndex, 0, queueArray.splice(e.oldIndex, 1)[0]);
        }
      })
    );






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



}
