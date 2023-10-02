import { audio, bitrateSelector, img, subtitleContainer, subtitleSelector, subtitleTrack } from "../lib/dom";
import player from "../lib/player";
import { blankImage, getSaved, params, parseTTML, save, updatePositionState } from "../lib/utils";



bitrateSelector.addEventListener('change', () => {
  const timeOfSwitch = parseInt(audio.dataset.seconds || '0');
  audio.src = bitrateSelector.value;
  audio.currentTime = timeOfSwitch;
  audio.play();
  updatePositionState();
});



subtitleSelector.addEventListener('change', () => {
  subtitleTrack.src = subtitleSelector.value;
  subtitleSelector.value ?
    subtitleContainer.classList.remove('hide') :
    subtitleContainer.classList.add('hide');
  parseTTML();
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



const deleteButton = <HTMLAnchorElement>document.getElementById('deleteButton');

deleteButton.addEventListener('click', () => {
  self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
  localStorage.clear();
});
