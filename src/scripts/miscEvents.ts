import { audio, bitrateSelector, discoverSwitch, img } from "../lib/dom";
import player from "../lib/player";
import { blankImage, getDB, getSaved, removeSaved, save, saveDB } from "../lib/utils";

img.onload = () => img.naturalWidth === 120 ? img.src = img.src.replace('maxres', 'mq').replace('.webp', '.jpg').replace('vi_webp', 'vi') : '';
img.onerror = () => img.src.includes('max') ? img.src = img.src.replace('maxres', 'mq') : '';


bitrateSelector.addEventListener('change', () => {
  const timeOfSwitch = audio.currentTime;
  audio.src = bitrateSelector.value;
  audio.currentTime = timeOfSwitch;
  audio.play();
});


const qualitySwitch = <HTMLElement>document.getElementById('qualitySwitch');

if (getSaved('hq') == 'true')
  qualitySwitch.toggleAttribute('checked');

qualitySwitch.addEventListener('click', async () => {

  getSaved('hq') ?
    removeSaved('hq') : // low
    save('hq', 'true'); // high

  const timeOfSwitch = audio.currentTime;
  await player(audio.dataset.id);
  audio.currentTime = timeOfSwitch;
})


const fullscreenSwitch = <HTMLElement>document.getElementById('fullscreenSwitch');

fullscreenSwitch.addEventListener('click', () => {
  document.fullscreenElement ?
    document.exitFullscreen() :
    document.documentElement.requestFullscreen();
});

const thumbnailSwitch = <HTMLElement>document.getElementById('thumbnailSwitch');

if (getSaved('img')) {
  thumbnailSwitch.removeAttribute('checked');
  img.src = blankImage;
  img.classList.toggle('hide');
}

thumbnailSwitch.addEventListener('click', () => {
  getSaved('img') ?
    removeSaved('img') :
    localStorage.setItem('img', 'off');
  location.reload();
});


const deleteButton = <HTMLButtonElement>document.getElementById('deleteButton');

const cdd = <HTMLDialogElement>document.getElementById('clearDataDialog');
const cddDiv = <HTMLDivElement>cdd.firstElementChild;
const [clear_sw, clear_library, clear_settings] = <HTMLCollectionOf<HTMLElement>>cddDiv.children;

deleteButton.onclick = () => cdd.showModal();


(<HTMLButtonElement>cdd.lastElementChild).addEventListener('click', () => {
  cdd.close();

  if (clear_sw.hasAttribute('checked')) {
    self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
    navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
  }

  if (clear_library.hasAttribute('checked'))
    removeSaved('library');

  if (clear_settings.hasAttribute('checked'))
    for (let i = 0; i < localStorage.length; i++)
      if (localStorage.key(i) !== 'library')
        removeSaved(<string>localStorage.key(i));

  if (cddDiv.querySelectorAll('[checked]').length)
    location.reload();
});



const discover = <HTMLElement>document.getElementById('discover');
if (getSaved('discover')) {
  discoverSwitch.toggleAttribute('checked');
  discover.classList.add('hide');
}
discoverSwitch.addEventListener('click', () => {

  if (discoverSwitch.hasAttribute('checked')) {
    const db = getDB();
    if (!confirm(`This will clear your existing ${db.discover?.length || 0} discoveries, continue?`)) return;
    delete db.discover;
    saveDB(db);
    discover.classList.add('hide');
    save('discover', 'off');

  } else {
    discover.classList.remove('hide');
    removeSaved('discover');
  }
});

