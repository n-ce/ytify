import { audio, img, searchFilters } from "../lib/dom";
import { getSaved, removeSaved, save } from "../lib/utils";
import player from "../lib/player";
import { getDB, saveDB } from "../lib/libraryUtils";
import { themer, cssVar } from "./theme";

const startupTabSwitch = <HTMLElement>document.getElementById('startupTab');
const imgLoadSelector = <HTMLSelectElement>document.getElementById('imgLoad');
const defaultFilterSongs = <HTMLElement>document.getElementById('defaultFilterSongs');
const qualitySwitch = <HTMLElement>document.getElementById('qualitySwitch');
const enforceProxySwitch = <HTMLElement>document.getElementById('enforceProxySwitch');
const discoverSwitch = <HTMLSelectElement>document.getElementById('discoverSwitch');
const discoverContainer = <HTMLDetailsElement>document.getElementById('discover');
const historySwitch = <HTMLElement>document.getElementById('historySwitch');
const historyContainer = <HTMLDetailsElement>document.getElementById('history');
const roundnessChanger = <HTMLSelectElement>document.getElementById('roundnessChanger');
const highContrastSwitch = <HTMLSelectElement>document.getElementById('highContrastSwitch');
const fullscreenSwitch = <HTMLElement>document.getElementById('fullscreenSwitch');
const clearCacheBtn = <HTMLButtonElement>document.getElementById('clearCacheBtn');
const restoreSettingsBtn = <HTMLButtonElement>document.getElementById('restoreSettingsBtn');


/////////////////////////////////////////////////////////////

startupTabSwitch.addEventListener('click', () => {
  getSaved('startupTab') ?
    removeSaved('startupTab') :
    save('startupTab', 'search');
});

if (getSaved('startupTab'))
  startupTabSwitch.toggleAttribute('checked');

/////////////////////////////////////////////////////////////

imgLoadSelector.addEventListener('change', () => {
  const val = imgLoadSelector.value;
  val === 'eager' ?
    removeSaved('imgLoad') :
    save('imgLoad', val);
  location.reload();
});

const savedImgLoad = getSaved('imgLoad')

if (savedImgLoad)
  imgLoadSelector.value = savedImgLoad;

if (imgLoadSelector.value === 'off') {
  themer();
  img.remove();
}
else audio.addEventListener('loadstart', themer);


/////////////////////////////////////////////////////////////

defaultFilterSongs.addEventListener('click', () => {
  getSaved('defaultFilter') ?
    removeSaved('defaultFilter') :
    save('defaultFilter', 'songs');
  location.assign('/search');
});

if (getSaved('defaultFilter')) {
  defaultFilterSongs.toggleAttribute('checked');
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

enforceProxySwitch.addEventListener('click', () => {
  getSaved('enforceProxy') ?
    removeSaved('enforceProxy') :
    save('enforceProxy', 'true');
});

if (getSaved('enforceProxy') === 'true') enforceProxySwitch.toggleAttribute('checked');

/////////////////////////////////////////////////////////////

discoverSwitch.addEventListener('click', (e) => {

  if (discoverSwitch.hasAttribute('checked')) {
    const db = getDB();
    if (!confirm(`This will clear your existing ${Object.keys(db.discover).length || 0} discoveries, continue?`)) {
      e.stopImmediatePropagation();
      return;
    }
    delete db.discover;
    saveDB(db);
    discoverContainer.classList.add('hide');
    save('discover', 'off');

  } else {
    discoverContainer.classList.remove('hide');
    removeSaved('discover');
  }
});

if (getSaved('discover')) {
  discoverSwitch.removeAttribute('checked');
  discoverContainer.classList.add('hide');
}

/////////////////////////////////////////////////////////////

historySwitch.addEventListener('click', (e) => {
  if (historySwitch.hasAttribute('checked')) {
    const db = getDB();
    if (!confirm(`This will clear ${Object.keys(db.history).length || 0} items from your history, continue?`)) {
      e.stopImmediatePropagation()
      return;
    }
    historySwitch.toggleAttribute('checked');
    delete db.history;
    saveDB(db);
    historyContainer.classList.add('hide');
    save('history', 'off')
  }
  else {
    historyContainer.classList.remove('hide');
    removeSaved('history');
  }
});

if (getSaved('history')) {
  historySwitch.removeAttribute('checked');
  historyContainer.classList.add('hide')
}


/////////////////////////////////////////////////////////////


if (getSaved('roundness')) {
  roundnessChanger.value = getSaved('roundness') || '2vmin';
  cssVar('--roundness', roundnessChanger.value);
}

roundnessChanger.addEventListener('change', () => {
  cssVar('--roundness', roundnessChanger.value);
  roundnessChanger.value === '2vmin' ?
    removeSaved('roundness') :
    save('roundness', roundnessChanger.value)
})
/////////////////////////////////////////////////////////////


highContrastSwitch.addEventListener('click', () => {
  getSaved('highContrast') ?
    removeSaved('highContrast') :
    save('highContrast', 'true');
  themer();
})

if (getSaved('highContrast'))
  highContrastSwitch.toggleAttribute('checked');
/////////////////////////////////////////////////////////////

fullscreenSwitch.addEventListener('click', () => {
  document.fullscreenElement ?
    document.exitFullscreen() :
    document.documentElement.requestFullscreen();
});

/////////////////////////////////////////////////////////////

clearCacheBtn.addEventListener('click', () => {
  self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
  location.reload();
});

restoreSettingsBtn.addEventListener('click', () => {
  const temp = getSaved('library');
  localStorage.clear();

  if (temp)
    save('library', temp);

  location.reload();
});

// emergency use
if (location.search === '?reset') {
  history.replaceState({}, '', location.pathname);
  clearCacheBtn.click();
  restoreSettingsBtn.click();
}
