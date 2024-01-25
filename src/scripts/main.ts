// import in order of site usage to minimize loading time
import '../stylesheets/style.css';
import './api';
import './router';
import './theme';
import './search';
import './audioEvents';
import './library';
import './superModal';
import './queue';
import './miscEvents';
import '../components/streamItem';
import '../components/listItem';
import '../components/toggleSwitch';
import { enqueueBtn, listContainer, openInYtBtn, playAllBtn, saveListBtn } from '../lib/dom';
import { clearQ, firstItemInQueue, listToQ } from './queue';
import { addListToCollection, createPlaylist } from './library';
import { registerSW } from 'virtual:pwa-register';
import { getSaved, notify, removeSaved, save } from '../lib/utils';
import { html, render } from 'lit';

window.updateSW = registerSW({
  onNeedRefresh() {
    import('../components/updatePrompt').then(_ =>
      render(html`
      <dialog id='changelog' onclick='(e)=>e.stopPropagation()' open>
        <update-prompt></update-prompt>
      </dialog>
    `, document.body));
  }
});


const startupTabSelector = <HTMLSelectElement>document.getElementById('startupTab');
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


// list tools functions

playAllBtn.addEventListener('click', () => {
  clearQ();
  listToQ(listContainer);
  firstItemInQueue().click();
});

enqueueBtn.onclick = () => listToQ(listContainer);

saveListBtn.addEventListener('click', () => {
  if (saveListBtn.textContent === ' Subscribe') {
    notify('This has not been implemented yet.');
    saveListBtn.innerHTML = '<i class="ri-stack-line"></i> Subscribed';
    return;
  }

  const listTitle = prompt('Set Title', <string>openInYtBtn.textContent?.substring(1));

  if (!listTitle) return;

  createPlaylist(listTitle);

  const list: { [index: string]: DOMStringMap } = {};
  listContainer.childNodes.forEach(_ => {
    const sender = (<HTMLElement>_).dataset;
    const id = <string>sender.id;
    list[id] = {};
    ['id', 'title', 'author', 'duration', 'thumbnail', 'channelUrl']
      .forEach($ => list[id][$] = sender[$]);
  });
  addListToCollection(listTitle, list);
  saveListBtn.innerHTML = '<i class="ri-stack-line"></i> Saved';
});

openInYtBtn.onclick = () => open('https://youtube.com' + listContainer.dataset.url);
