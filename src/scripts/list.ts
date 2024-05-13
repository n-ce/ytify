import { clearListBtn, deleteCollectionBtn, enqueueBtn, importListBtn, listAnchor, listBtnsContainer, listContainer, openInYtBtn, playAllBtn, removeFromListBtn, renameCollectionBtn, saveListBtn } from '../lib/dom';
import { clearQ, firstItemInQueue, listToQ } from './queue';
import { hostResolver, notify } from '../lib/utils';
import { addListToCollection, createPlaylist, getDB, saveDB } from '../lib/libraryUtils';
import { atpSelector } from './superModal';



listBtnsContainer.addEventListener('click', e => {
  const btn = e.target as HTMLButtonElement;
  if (!btn.matches('button'))
    return;

  const db = getDB();
  const id = <string>listAnchor.dataset.id;
  const a = <HTMLAnchorElement>document.getElementById(id);
  const atpOption = <HTMLOptionElement>atpSelector.querySelector(`[value="${id}"]`);

  if (btn === playAllBtn) {
    clearQ();
    listToQ(listContainer);
    firstItemInQueue().click();
  }
  else if (btn === enqueueBtn)
    listToQ(listContainer);

  else if (btn === saveListBtn)
    console.log('savelist');

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
        list[sid] = {};
        ['id', 'title', 'author', 'duration', 'thumbnail', 'channelUrl']
          .forEach($ => list[sid][$] = sender[$]);
      });

    addListToCollection(listTitle, list);
    notify('The list has been imported to library as ' + listTitle);
  }
  else if (btn === deleteCollectionBtn) {

    atpOption.remove();
    a.remove();
    delete db[a.id];
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
    a.id = newTitle;
    a.innerHTML = a.innerHTML.replace(id, newTitle);
    db[newTitle] = db[id];
    delete db[id];
    saveDB(db);
  }
})
