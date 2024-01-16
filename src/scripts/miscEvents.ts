import { audio, bitrateSelector, discoveryStorageLimit, img } from "../lib/dom";
import player from "../lib/player";
import { blankImage, getDB, getSaved, save, saveDB } from "../lib/utils";

img.onload = () => img.naturalWidth === 120 ? img.src = img.src.replace('maxres', 'mq').replace('.webp', '.jpg').replace('vi_webp', 'vi') : '';
img.onerror = () => img.src.includes('max') ? img.src = img.src.replace('maxres', 'mq') : '';


bitrateSelector.addEventListener('change', () => {
  const timeOfSwitch = audio.currentTime;
  audio.src = bitrateSelector.value;
  audio.currentTime = timeOfSwitch;
  audio.play();
});




const qualitySwitch = <HTMLElement>document.getElementById('qualitySwitch');

if (getSaved('quality') == 'hq')
  qualitySwitch.toggleAttribute('checked');

qualitySwitch.addEventListener('click', async () => {

  getSaved('quality') ?
    localStorage.removeItem('quality') : // low
    save('quality', 'hq'); // high

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
    localStorage.removeItem('img') :
    localStorage.setItem('img', 'off');
  location.reload();
});


const deleteButton = <HTMLButtonElement>document.getElementById('deleteButton');

const cdd = <HTMLDialogElement>document.getElementById('clearDataDialog');
const cddDiv = <HTMLDivElement>cdd.firstElementChild;
const [cddCancel, cddSubmit] = <HTMLCollectionOf<HTMLButtonElement>>((<HTMLSpanElement>cdd.lastElementChild).children);

cddCancel.onclick = () => cdd.close();

deleteButton.addEventListener('click', () => {
  cdd.showModal();
  cddDiv.innerHTML = '<toggle-switch>Service Worker</toggle-switch>';
  for (let i = 0; i < localStorage.length; i++) {
    const ts = document.createElement('toggle-switch');
    const key = localStorage.key(i);
    ts.textContent = key;
    cddDiv.appendChild(ts);
  }
});

cddSubmit.addEventListener('click', () => {

  const swBtn = <HTMLElement>cddDiv.firstElementChild;
  if (swBtn.hasAttribute('checked')) {
    self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
    navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
  }
  swBtn.remove();

  cddDiv.querySelectorAll('[checked]').forEach(ts => localStorage.removeItem(<string>ts.textContent));

  cdd.close();
  location.reload();
});



discoveryStorageLimit.value = getSaved('discoveryLimit') || '512';

discoveryStorageLimit.addEventListener('change', () => {
  const val = discoveryStorageLimit.value;
  val === '512' ?
    localStorage.removeItem('discoveryLimit') :
    save('discoveryLimit', val);

  if (val === '0') {
    const db = getDB();
    delete db.discover;
    saveDB(db);
    document.getElementById('discover')?.classList.add('hide');
  }
  else document.getElementById('discover')?.classList.remove('hide');
});
