import { enqueueBtn, listContainer, openInYtBtn, playAllBtn, saveListBtn } from '../lib/dom';
import { clearQ, firstItemInQueue, listToQ } from './queue';
import { addListToCollection, createPlaylist } from './library';
import { notify } from '../lib/utils';

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
  listContainer
    .querySelectorAll('stream-item')
    .forEach(_ => {
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
