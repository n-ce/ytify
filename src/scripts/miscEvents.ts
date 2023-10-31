import { audio, bitrateSelector, img, subtitleContainer, subtitleSelector, subtitleTrack } from "../lib/dom";
import player from "../lib/player";
import { blankImage, getSaved, imgUrl, parseTTML, save } from "../lib/utils";

img.addEventListener('load', () => {
  if (img.naturalWidth === 120)
    img.src = img.src.includes('webp') ?
      ('https://corsproxy.io?' + encodeURIComponent(`https://i.ytimg.com/vi/${audio.dataset.id}/hqdefault.jpg`)) :
      imgUrl(
        <string>audio.dataset.id,
        (img.src.includes('maxresdefault') ? 'hq720' : 'hqdefault')
      );
});

img.addEventListener('error', () => {
  img.src = imgUrl(
    <string>audio.dataset.id,
    (img.src.includes('maxresdefault') ? 'hqdefault' : 'maxresdefault')
  );
});


bitrateSelector.addEventListener('change', () => {
  const timeOfSwitch = audio.currentTime;
  audio.src = bitrateSelector.value;
  audio.currentTime = timeOfSwitch;
  audio.play();
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


const deleteButton = <HTMLAnchorElement>document.getElementById('deleteButton');

deleteButton.addEventListener('click', () => {
  self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
  localStorage.clear();
});
