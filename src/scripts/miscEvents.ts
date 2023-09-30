import { audio, bitrateSelector, img } from "../lib/dom";
import player from "../lib/player";
import { blankImage, getSaved, params, save, updatePositionState } from "../lib/utils";


bitrateSelector.addEventListener('change', () => {
  const timeOfSwitch = parseInt(audio.dataset.seconds || '0');
  audio.src = bitrateSelector.value;
  audio.currentTime = timeOfSwitch;
  audio.play();
  updatePositionState();
});

const qualitySwitch = <HTMLElement>document.getElementById('qualitySwitch');

if (getSaved('quality') == 'hq')
  qualitySwitch.toggleAttribute('checked');

qualitySwitch.addEventListener('click', async () => {

  getSaved('quality') ?
    localStorage.removeItem('quality') : // low
    save('quality', 'hq'); // high

  if (params.has('s')) {
    const timeOfSwitch = parseInt(audio.dataset.seconds || '');
    await player(params.get('s'));
    audio.currentTime = timeOfSwitch;
    updatePositionState();
  }

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

  if (getSaved('img')) {
    img.src = img.dataset.saved || '/ytify_thumbnail_min.webp';
    localStorage.removeItem('img');
  }
  else {
    save('img', img.src);
    img.src = blankImage;
  }
  img.classList.toggle('hide');
});


const librarySwitch = <HTMLElement>document.getElementById('librarySwitch');


librarySwitch.addEventListener('click', () => {
  (<HTMLAnchorElement>document.getElementById('/library')).classList.toggle('hide');
  getSaved('library') ?
    localStorage.removeItem('library') :
    save('library', 'on');
})

if (getSaved('library'))
  librarySwitch.click();



const volumeChanger = <HTMLInputElement>document.getElementById('volumeChanger');
const volumeIcon = <HTMLLabelElement>volumeChanger.previousElementSibling;

volumeIcon.addEventListener('click', () => {
  volumeChanger.value = audio.volume ? '0' : '100';
  audio.volume = audio.volume ? 0 : 1;
  volumeIcon.classList.replace(volumeIcon.className, volumeIcon.className === 'ri-volume-down-line' ? 'ri-volume-mute-line' : 'ri-volume-down-line');

});

volumeChanger.addEventListener('change', () => {
  audio.volume = parseFloat(volumeChanger.value) / 100;

  volumeIcon.classList.replace(volumeIcon.className, audio.volume ? 'ri-volume-down-line' : 'ri-volume-mute-line');

})



const deleteButton = <HTMLAnchorElement>document.getElementById('deleteButton');

deleteButton.addEventListener('click', () => {
  self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
  localStorage.clear();
});
