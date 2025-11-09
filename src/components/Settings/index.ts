import './Settings.css';
import { html, render } from 'uhtml';
import { i18n } from "../../scripts/i18n";
import { params } from '../../lib/store';
import app from './app';
import search from './search';
import playback from './playback';
import library from './library';
import personalize from './personalize';
import parental from './parental';
import { settingsContainer } from '../../lib/dom';

export default async function() {
  const settingsFrag = document.createDocumentFragment();
  const partsM = await parental();

  render(settingsFrag, html`
      <h3
      @click=${() => settingsContainer.close()}
      >← ${i18n('nav_settings')}</h3>
      ${app()}
      ${search()}
      ${playback()}
      ${library()}
      ${personalize()}
      ${partsM}
  `);
  settingsContainer.prepend(settingsFrag);
  settingsContainer.showModal();
  settingsContainer.addEventListener('close', () => {
    settingsContainer.innerHTML = document.getElementById('actionsContainer')!.outerHTML;
  });

}



async function clearCache(_: Event | undefined = undefined) {
  await self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  await navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });

  if (_?.type === 'click') location.replace(location.origin + location.pathname.replace(/\/[^\/]*$/, '') || '/');
}


function exportSettings() {
  const link = document.createElement('a');
  link.download = 'ytify_settings.json';
  link.href = `data:text/json;charset=utf-8,${encodeURIComponent(localStorage.getItem('store') || '{}')}`;
  link.click();
}

async function importSettings(e: Event) {
  e.preventDefault();
  const newSettings = await (
    (e.target as HTMLInputElement).files as FileList
  )[0].text();

  if (confirm('This will overwrite your current settings with the imported settings, continue?'))
    localStorage.setItem('store', newSettings);
}


// emergency use
if (params.has('reset')) {
  clearCache();
  localStorage.removeItem('store');
  history.replaceState({}, '', location.pathname);
}


document.getElementById('clearCacheBtn')!.addEventListener('click', clearCache);
document.getElementById('exportSettingsBtn')!.addEventListener('click', exportSettings);
document.getElementById('importSettingsBtn')!.addEventListener('change', importSettings);
document.getElementById('restoreSettingsBtn')!.addEventListener('click', () => {
  localStorage.removeItem('store');
  location.replace(location.origin + location.pathname.replace(/\/[^\/]*$/, '') || '/');
});


