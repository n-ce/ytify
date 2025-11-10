
import { listStore, setListStore, setStore, t } from "@lib/stores";
import { addToCollection, createCollection } from "@lib/utils";


export function importList() {

  const { list, name } = listStore;
  const listTitle = prompt(t('list_set_title'), name);


  if (!listTitle) return;

  createCollection(listTitle);
  addToCollection(listTitle, list);

  setStore('snackbar', t('list_imported', listTitle));
}

export function shareCollection(data: CollectionItem[]) {
  setListStore('isLoading', true);

  fetch(location.origin + '/blob', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then(res => res.text())
    .then(_ => {
      const type = "text/plain";
      const blob = new Blob([_], { type });
      const link = [new ClipboardItem({ [type]: blob })];
      navigator.clipboard.write(link);
      setStore('snackbar', 'Collection link copied to clipboard!');
    })
    .catch(() => {
      setStore('snackbar', 'Failed to share collection.');
    })
    .finally(() => setListStore('isLoading', false));

}
