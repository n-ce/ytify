import { audio, img, searchFilters } from "../lib/dom";
import { getSaved, removeSaved, save } from "../lib/utils";
import player from "../lib/player";
import { blankImage } from "../lib/imageUtils";
import { getDB, saveDB } from "../lib/libraryUtils";

const startupTabSelector = <HTMLSelectElement>document.getElementById('startupTab');
const ytmPlsSwitch = <HTMLElement>document.getElementById('featuredPlaylistsSwitch');
const defaultFilterSongs = <HTMLElement>document.getElementById('defaultFilterSongs');
const qualitySwitch = <HTMLElement>document.getElementById('qualitySwitch');
const thumbnailSwitch = <HTMLElement>document.getElementById('thumbnailSwitch');
const lazyLoadSwitch = <HTMLElement>document.getElementById('lazyThumbSwitch');
const discoverSwitch = <HTMLSelectElement>document.getElementById('discoverSwitch');
const discover = <HTMLDetailsElement>document.getElementById('discover');
const historySwitch = <HTMLElement>document.getElementById('historySwitch');
const history = <HTMLDetailsElement>document.getElementById('history');
const bottomNavSwitch = <HTMLElement>document.getElementById('bottomNavSwitch');
const fullscreenSwitch = <HTMLElement>document.getElementById('fullscreenSwitch');

export { ytmPlsSwitch };


/////////////////////////////////////////////////////////////

startupTabSelector.addEventListener('change', () => {
  const tab = startupTabSelector.value;
  tab ?
    save('startupTab', tab) :
    removeSaved('startupTab');
});

const savedStartupTab = getSaved('startupTab') || '';
if (savedStartupTab) {
  startupTabSelector.value = savedStartupTab;
  if (location.pathname === '/')
    (<HTMLAnchorElement>document.getElementById(savedStartupTab)).click();
}

/////////////////////////////////////////////////////////////

ytmPlsSwitch.addEventListener('click', () => {
  getSaved('featuredPlaylists') ?
    removeSaved('featuredPlaylists') :
    save('featuredPlaylists', 'off');
  location.assign('/search');
});

if (getSaved('featuredPlaylists')) {
  ytmPlsSwitch.removeAttribute('checked');
  (<HTMLHeadingElement>document.querySelector('h1.featuredPlaylists')).textContent = 'Search Results Appear Here.';
}

/////////////////////////////////////////////////////////////

defaultFilterSongs.addEventListener('click', () => {
  getSaved('defaultFilter') ?
    removeSaved('defaultFilter') :
    save('defaultFilter', 'songs');
  location.assign('/search');
});

if (getSaved('defaultFilter')) {
  defaultFilterSongs.setAttribute('checked', '');
  searchFilters.value = 'music_songs';
}

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
    save('img', 'off');
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
    save('lazyImg', 'true');
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

bottomNavSwitch.addEventListener('click', () => {
  const state = getSaved('bottomNav');
  state ?
    removeSaved('bottomNav') :
    save('bottomNav', 'true');

  document.body.style.flexDirection = `column${state ? '' : '-reverse'}`;
  (<HTMLDivElement>document.querySelector('nav')).style.padding = state ? '5% 3% 0 3%' : '0 3% 5% 3%';
});

if (getSaved('bottomNav')) {
  bottomNavSwitch.toggleAttribute('checked');
  document.body.style.flexDirection = 'column-reverse';
  (<HTMLDivElement>document.querySelector('nav')).style.padding = '0 3% 5% 3%';
}

/////////////////////////////////////////////////////////////

fullscreenSwitch.addEventListener('click', () => {
  document.fullscreenElement ?
    document.exitFullscreen() :
    document.documentElement.requestFullscreen();
});

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

