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
import { blankImage, getSaved, idFromURL, params } from '../lib/utils';
import player from '../lib/player';
import { enqueueBtn, img, listContainer, openInYtBtn, playAllBtn, saveListBtn } from '../lib/dom';
import { clearQ, firstItemInQueue, listToQ } from './queue';
import { addListToCollection, createPlaylist } from './library';
import { registerSW } from 'virtual:pwa-register';
const update = registerSW({
  onNeedRefresh() {
    fetch('https://raw.githubusercontent.com/wiki/n-ce/ytify/Changelog.md')
      .then(res => res.text())
      .then(data => {
        if (confirm('An Update is Available, Update?' + data))
          update();
      });
  }
})



const streamQuery = params.get('s') || idFromURL(params.get('url') || params.get('text'));

streamQuery ? player(streamQuery) : img.src = getSaved('img') ? blankImage : '/ytify_thumbnail_min.webp';

// temporary location for these functions below because i couldnt decide where to put them


// list tools functions


playAllBtn.addEventListener('click', () => {
  clearQ();
  listToQ(listContainer);
  firstItemInQueue().click();
});

enqueueBtn.onclick = () => listToQ(listContainer);

saveListBtn.addEventListener('click', () => {
  if (saveListBtn.textContent === ' Subscribe') {
    alert('This has not been implemented yet.');
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
