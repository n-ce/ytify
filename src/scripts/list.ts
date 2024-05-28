import { clearListBtn, deleteCollectionBtn, enqueueBtn, importListBtn, listAnchor, listBtnsContainer, listContainer, openInYtBtn, playAllBtn, removeFromListBtn, renameCollectionBtn, subscribeListBtn } from '../lib/dom';
import { clearQ, firstItemInQueue, listToQ } from './queue';
import { hostResolver, notify } from '../lib/utils';
import { addListToCollection, createPlaylist, getDB, saveDB, toCollection } from '../lib/libraryUtils';
import { atpSelector } from './superModal';
import { getThumbIdFromLink } from '../lib/imageUtils';

listBtnsContainer.addEventListener('click', e => {
  const btn = e.target as HTMLButtonElement;
  if (!btn.matches('button'))
    return;

  const db = getDB();
  const id = <string>listAnchor.dataset.id;


  const atpOption = <HTMLOptionElement>atpSelector.querySelector(`[value="${id}"]`);

  if (btn === playAllBtn) {
    clearQ();
    listToQ(listContainer);
    firstItemInQueue().dispatchEvent(new MouseEvent("dblclick", { bubbles: true, view: window }));
  }
  else if (btn === enqueueBtn)
    listToQ(listContainer);

  else if (btn === subscribeListBtn) {
    const lcd = <{ [index: string]: string }>listContainer.dataset;

    const state = ['Subscribe', 'Subscribed'];
    const dom = subscribeListBtn.innerHTML;

    if (dom.includes(state[1])) {
      delete db[lcd.type][lcd.id];
      state.reverse();
    }
    else {
      const dataset: Partial<Record<'name' | 'uploader' | 'thumbnail' | 'id', string | undefined>> = {
        id: lcd.id,
        name: lcd.name,
        thumbnail: getThumbIdFromLink(lcd.thumbnail)
      };

      if (lcd.type === 'playlists')
        dataset.uploader = lcd.uploader;

      toCollection(lcd.type, dataset, db);
    }
    subscribeListBtn.innerHTML = dom.replace(state[0], state[1]);
    saveDB(db);

  }

  else if (btn === openInYtBtn)
    open(hostResolver(<string>listContainer.dataset.url));

  else if (btn === removeFromListBtn) {
    listContainer.querySelectorAll('.streamItem').forEach(e => e.classList.toggle('delete'));
    removeFromListBtn.classList.toggle('delete');
  }
  else if (btn === importListBtn) {
    const listTitle = prompt('Set Title', <string>openInYtBtn.textContent?.substring(1));

    if (!listTitle) return;

    createPlaylist(listTitle);

    const list: { [index: string]: DOMStringMap } = {};
    listContainer
      .querySelectorAll('.streamItem')
      .forEach(_ => {
        const sender = (<HTMLElement>_).dataset;
        const sid = <string>sender.id;
        list[sid] = {
          'id': sender.id,
          'title': sender.title,
          'author': sender.author,
          'duration': sender.duration,
          'channel_url': sender.channel_url
        };
      });

    addListToCollection(listTitle, list);
    notify(listTitle + ' has been imported to your playlists.');
  }
  else if (btn === deleteCollectionBtn) {

    atpOption.remove();
    delete db[id];
    saveDB(db);
    history.back();
  }
  else if (btn === clearListBtn) {
    delete db[id];
    saveDB(db);
    listContainer.innerHTML = '';
  }
  else if (btn === renameCollectionBtn) {

    const newTitle = prompt('Enter the new title', id)?.trim();
    if (!newTitle) return;
    atpOption.text = newTitle;
    atpOption.value = newTitle;
    db[newTitle] = db[id];
    delete db[id];
    saveDB(db);
  }
})

