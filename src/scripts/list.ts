import { clearListBtn, deleteCollectionBtn, enqueueBtn, importListBtn, listBtnsContainer, listContainer, openInYtBtn, playAllBtn, removeFromListBtn, renameCollectionBtn, subscribeListBtn } from '../lib/dom';
import { clearQ, firstItemInQueue, listToQ } from './queue';
import { hostResolver } from '../lib/utils';
import { store } from '../lib/store';
import { importList, subscribeList } from '../modules/listUtils';
import { getDB, saveDB } from '../lib/libraryUtils';



listBtnsContainer.addEventListener('click', async e => {
  const btn = e.target as HTMLButtonElement;
  if (!btn.matches('button'))
    return;

  const db = getDB();
  const id = store.list.id;
  const atcOption = <HTMLOptionElement>document.getElementById('collectionSelector')!.querySelector(`[value="${id}"]`);

  if (btn === playAllBtn) {
    clearQ();
    listToQ(listContainer);
    firstItemInQueue().click();
  }
  else if (btn === enqueueBtn)
    listToQ(listContainer);

  else if (btn === openInYtBtn)
    open(['https://youtube.com', location.origin].includes(store.linkHost) ? ('https://youtube.com' + store.list.url) : hostResolver(store.list.url));

  else if (btn === subscribeListBtn)
    subscribeList(db);

  else if (btn === removeFromListBtn) {
    listContainer.querySelectorAll('.streamItem').forEach(e => e.classList.toggle('delete'));
    removeFromListBtn.classList.toggle('delete');
  }

  else if (btn === importListBtn)
    importList();

  else if (btn === deleteCollectionBtn) {
    if (!db) return;

    if (!confirm('Are you sure you want to delete the collection  ' + id + ' ?'))
      return;
    atcOption.remove();
    delete db[id];
    saveDB(db);
    history.back();
  }
  else if (btn === clearListBtn) {
    if (!confirm('Are you sure you want to clear ' + id + ' ?'))
      return;
    delete db[id];
    saveDB(db);
    listContainer.innerHTML = '';
  }
  else if (btn === renameCollectionBtn) {

    const newTitle = prompt('Enter the new title', id)?.trim();
    if (!newTitle) return;
    atcOption.text = newTitle;
    atcOption.value = newTitle;
    db[newTitle] = db[id];
    delete db[id];
    saveDB(db);
  }
});



