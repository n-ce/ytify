// @ts-ignore

import { listStore, setListStore, setStore, t } from "../stores";
import { addListToCollection, createCollection, getThumbIdFromLink, saveDB, toCollection } from "../utils";

export function subscribeList(db: Library) {
  const { isSubscribed, id, type, name, thumbnail, uploader } = listStore;
  if (isSubscribed)
    delete db[type][id];
  else {
    const dataset: List & { uploader?: string } = {
      id, name,
      thumbnail: getThumbIdFromLink(thumbnail)
    };

    if (type === 'playlist')
      dataset.uploader = uploader;

    toCollection(type, dataset, db);
  }
  setListStore('isSubscribed', !isSubscribed)
  saveDB(db, 'subscribe');
}

export function importList() {

  const { list, name } = listStore;
  const listTitle = prompt(t('list_set_title'), name);


  if (!listTitle) return;

  createCollection(listTitle);

  const listObject = list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as { [index: string]: CollectionItem });

  addListToCollection(listTitle, listObject);
  setStore('snackbar', t('list_imported', listTitle));
}

export function shareCollection(data: Collection) {
  setListStore('isLoading', true);

  fetch(location.origin + '/blob', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(Object.values(data)),
  })
    .then(res => res.text())
    .then(_ => {
      const type = "text/plain";
      const blob = new Blob([_], { type });
      const link = [new ClipboardItem({ [type]: blob })];
      navigator.clipboard.write(link);
    })
    .catch(() => {
      alert('failed');
    })
    .finally(() => setListStore('isLoading', false));

}