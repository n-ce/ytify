import './Settings.css';
import { html, render } from 'uhtml';
import { i18n } from "../../scripts/i18n";
import { getSaved, params } from '../../lib/store';
import { save, $ } from '../../lib/utils';
import app from './app';
import search from './search';
import playback from './playback';
import library from './library';
import personalize from './personalize';
import parental from './parental';
import { settingsContainer } from '../../lib/dom';

export default function() {
  const settingsFrag = document.createDocumentFragment();

  render(settingsFrag, html`
      <h3>${i18n('nav_settings')}</h3>
      ${app()}
      ${search()}
      ${playback()}
      ${library()}
      ${personalize()}
      ${parental()}
  `);
  settingsContainer.prepend(settingsFrag);
  settingsContainer.showModal();
  settingsContainer.addEventListener('close', () => {
    settingsContainer.innerHTML = document.getElementById('actionsContainer')!.outerHTML;

  })

}



async function clearCache(_: Event | undefined = undefined) {
  await self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  await navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });

  if (_?.type === 'click') location.reload();
}

function restoreSettings(_: Event | undefined = undefined) {
  const temp = getSaved('library');
  localStorage.clear();

  if (temp) save('library', temp);

  if (_?.type === 'click') location.reload();
}

function extractSettings() {
  const keys: { [index: string]: string } = {};
  const len = localStorage.length;
  for (let i = 0; i < len; i++) {
    const key = localStorage.key(i) as string;
    if (key === 'library') continue;
    keys[key] = getSaved(key) as string;
  }
  return keys;
}

function exportSettings() {
  const link = $('a');
  link.download = 'ytify_settings.json';
  link.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(extractSettings(), undefined, 2))}`;
  link.click();
}

async function importSettings(e: Event) {
  e.preventDefault();
  const newSettings = JSON.parse(
    await (
      (e.target as HTMLInputElement).files as FileList
    )[0].text()
  );

  if (confirm('This will merge your current settings with the imported settings, continue?')) {
    for (const key in newSettings)
      save(key, newSettings[key]);

    location.reload();
  }
}


// emergency use
if (params.has('reset')) {
  clearCache();
  restoreSettings();
  history.replaceState({}, '', location.pathname);
}


document.getElementById('clearCacheBtn')!.addEventListener('click', clearCache);
document.getElementById('restoreSettingsBtn')!.addEventListener('click', restoreSettings);
document.getElementById('exportSettingsBtn')!.addEventListener('click', exportSettings);
document.getElementById('importSettingsBtn')!.addEventListener('change', importSettings);


