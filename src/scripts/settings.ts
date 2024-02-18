import { audio, img, searchFilters } from "../lib/dom";
import player from "../lib/player";
import { blankImage, getDB, getSaved, removeSaved, save, saveDB } from "../lib/utils";

const startupTabSelector = <HTMLSelectElement>document.getElementById('startupTab');
const fullscreenSwitch = <HTMLElement>document.getElementById('fullscreenSwitch');
const defaultFilterSongs = <HTMLElement>document.getElementById('defaultFilterSongs');
const autoQueueSwitch = <HTMLElement>document.getElementById('autoQueueSwitch');
const qualitySwitch = <HTMLElement>document.getElementById('qualitySwitch');
const thumbnailSwitch = <HTMLElement>document.getElementById('thumbnailSwitch');
const lazyLoadSwitch = <HTMLElement>document.getElementById('lazyThumbSwitch');
const discoverSwitch = <HTMLSelectElement>document.getElementById('discoverSwitch');
const discover = <HTMLDetailsElement>document.getElementById('discover');
const historySwitch = <HTMLElement>document.getElementById('historySwitch');
const history = <HTMLDetailsElement>document.getElementById('history');

/////////////////////////////////////////////////////////////

startupTabSelector.addEventListener('change', () => {
  const tab = startupTabSelector.value;
  tab ?
    save('startupTab', tab) :
    removeSaved('startupTab');
});

const savedStartupTab = getSaved('startupTab');
if (savedStartupTab) {
  startupTabSelector.value = savedStartupTab;
  if (location.pathname === '/')
    (<HTMLAnchorElement>document.getElementById(savedStartupTab)).click();
}


/////////////////////////////////////////////////////////////

fullscreenSwitch.addEventListener('click', () => {
  document.fullscreenElement ?
    document.exitFullscreen() :
    document.documentElement.requestFullscreen();
});

/////////////////////////////////////////////////////////////

defaultFilterSongs.addEventListener('click', () => {
  getSaved('defaultFilter') ?
    removeSaved('defaultFilter') :
    save('defaultFilter', 'songs');
});

if (getSaved('defaultFilter')) {
  defaultFilterSongs.setAttribute('checked', '');
  searchFilters.value = 'music_songs';
}

/////////////////////////////////////////////////////////////

autoQueueSwitch.addEventListener('click', () => {
  getSaved('autoQueue') ?
    removeSaved('autoQueue') :
    save('autoQueue', 'off');
});

if (getSaved('autoQueue') === 'off')
  autoQueueSwitch.removeAttribute('checked');

/////////////////////////////////////////////////////////////

qualitySwitch.addEventListener('click', async () => {
  getSaved('hq') ?
    removeSaved('hq') :
    save('hq', 'true');

  const timeOfSwitch = audio.currentTime;
  await player(audio.dataset.id);
  audio.currentTime = timeOfSwitch;
});

if (getSaved('hq') == 'true')
  qualitySwitch.toggleAttribute('checked');

/////////////////////////////////////////////////////////////

thumbnailSwitch.addEventListener('click', () => {
  getSaved('img') ?
    removeSaved('img') :
    localStorage.setItem('img', 'off');
  location.reload();
});

if (getSaved('img')) {
  thumbnailSwitch.removeAttribute('checked');
  img.src = blankImage;
  img.classList.toggle('hide');
}

/////////////////////////////////////////////////////////////

lazyLoadSwitch.addEventListener('click', () => {
  getSaved('lazyImg') ?
    removeSaved('lazyImg') :
    localStorage.setItem('lazyImg', 'true');
});

if (getSaved('lazyImg'))
  lazyLoadSwitch.toggleAttribute('checked');

/////////////////////////////////////////////////////////////

discoverSwitch.addEventListener('click', () => {
  if (discoverSwitch.hasAttribute('checked')) {
    const db = getDB();
    if (!confirm(`This will clear your existing ${Object.keys(db.discover).length || 0} discoveries, continue?`))
      return discoverSwitch.toggleAttribute('checked');
    delete db.discover;
    saveDB(db);
    discover.classList.add('hide');
    save('discover', 'off');

  } else {
    discover.classList.remove('hide');
    removeSaved('discover');
  }
});

if (getSaved('discover')) {
  discoverSwitch.removeAttribute('checked');
  discover.classList.add('hide');
}

/////////////////////////////////////////////////////////////

historySwitch.addEventListener('click', () => {
  if (historySwitch.hasAttribute('checked')) {
    const db = getDB();
    if (!confirm(`This will clear ${Object.keys(db.history).length || 0} items from your history, continue?`)) return historySwitch.toggleAttribute('checked');
    delete db.history;
    saveDB(db);
    history.classList.add('hide');
    save('history', 'off')
  }
  else {
    history.classList.remove('hide');
    removeSaved('history');
  }
});

if (getSaved('history')) {
  historySwitch.removeAttribute('checked');
  history.classList.add('hide')
}

/////////////////////////////////////////////////////////////

document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
  self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
  location.reload();
});

document.getElementById('restoreSettingsBtn')?.addEventListener('click', () => {
  for (let i = 0; i < localStorage.length; i++)
    if (localStorage.key(i) !== 'library')
      removeSaved(<string>localStorage.key(i));
  location.reload();
});

