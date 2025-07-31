import { clearListBtn, deleteCollectionBtn, enqueueBtn, importListBtn, listBtnsContainer, listContainer, openInYtBtn, playAllBtn, shareCollectionBtn, removeFromListBtn, renameCollectionBtn, subscribeListBtn, radioCollectionBtn, sortCollectionBtn, queuelist, sortByTitleBtn, sortByAuthorBtn } from '../lib/dom';
import { goTo, hostResolver } from '../lib/utils';
import { store } from '../lib/store';
import { importList, subscribeList, shareCollection } from '../modules/listUtils';
import { getDB, saveDB, renderCollection } from '../lib/libraryUtils';
import Sortable, { type SortableEvent } from 'sortablejs';
import { render, html } from 'uhtml';
import { i18n } from './i18n';

new Sortable(listContainer, {
  handle: '.ri-draggable',
  onUpdate(e: SortableEvent) {
    if (e.oldIndex == null || e.newIndex == null) return;
    const collection = store.list.id;
    const db = getDB();
    const dataArray = Object.entries(db[collection]);
    const [oldKey, oldItem] = dataArray.splice(e.oldIndex, 1)[0];
    dataArray.splice(
      e.newIndex, 0,
      [oldKey, oldItem]
    );
    db[collection] = Object.fromEntries(dataArray);
    saveDB(db);
  }
});


// clones any list items from the provided container to queue

function listToQ(container: HTMLDivElement) {
  const items = container.querySelectorAll('.streamItem') as NodeListOf<HTMLElement>;
  items.forEach(item => {
    item.dataset.channelUrl = item.dataset.channel_url;
    item.dataset.lastUpdated = item.dataset.last_updated;
    store.queue.append(item.dataset);
  });
  goTo('/upcoming');
}

listBtnsContainer.addEventListener('click', async e => {
  const btn = e.target as HTMLLIElement;
  if (!btn.matches('li'))
    return;

  const db = getDB();
  const id = store.list.id;
  const atcIdx = store.addToCollectionOptions.indexOf(id);

  if (btn === playAllBtn) {
    store.queue.list.length = 0;
    queuelist.innerHTML = '';
    listToQ(listContainer);
    store.queue.firstChild()?.click();
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

    if (!confirm(i18n('list_prompt_delete', id)))
      return;
    store.addToCollectionOptions.splice(atcIdx, 1);
    delete db[id];
    saveDB(db, 'delete');
    history.back();
  }
  else if (btn === clearListBtn) {
    if (!confirm(i18n('list_prompt_clear', id)))
      return;
    delete db[id];
    saveDB(db);
    history.back();
  }
  else if (btn === renameCollectionBtn) {

    const newTitle = prompt(i18n('list_prompt_rename'), id)?.trim();
    if (!newTitle) return;
    store.addToCollectionOptions[atcIdx] = newTitle;
    db[newTitle] = db[id];
    delete db[id];
    saveDB(db, 'rename');
  }
  else if (btn === shareCollectionBtn)
    shareCollection(db[id]);
  else if (btn === radioCollectionBtn)
    import('../modules/supermix').then(mod => mod.default(Object.keys(db[id])))
  else if (btn === sortCollectionBtn) {
    sortCollectionBtn.classList.toggle('checked');
    sort();
  }
  else if (btn === sortByTitleBtn) {
    sort('title');
  }
  else if (btn === sortByAuthorBtn)
    sort('author');

  function sort(field: keyof CollectionItem | '' = '') {

    let clxnArr = Object.values(db[id]);
    if (field) {
      clxnArr = clxnArr.sort((a, b) => {
        if (a[field]! > b[field]!) return 1;
        if (a[field]! < b[field]!) return -1;
        return 0;
      });

      const cls = 'ri-sort-' + (field === 'title' ? 'alphabet-' : '');
      const ico = (field === 'title' ? sortByTitleBtn : sortByAuthorBtn).firstElementChild as HTMLElement;
      const state = ['asc', 'desc'];
      if (ico.className.endsWith('desc')) {
        state.reverse();
        clxnArr = clxnArr.reverse();
      }
      ico.classList.replace(
        cls + state[0], cls + state[1]
      );

      db[id] = Object.fromEntries(clxnArr.map((v) => [v.id, v]));
      saveDB(db);

    }
    render(listContainer, html``);
    renderCollection(clxnArr, sortCollectionBtn.classList.contains('checked'));
  }

});



