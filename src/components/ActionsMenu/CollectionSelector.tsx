import { onMount } from 'solid-js';
import { addToCollection, createCollection, getDB } from '@lib/utils/library';
import { listStore, setListStore, store, t } from '@lib/stores';

export default function(_: {
  close: () => void
}) {

  onMount(() => {
    const initialKeys = Object.keys(getDB());
    setListStore('addToCollectionOptions', []);

    for (const key of initialKeys) {
      if (!listStore.reservedCollections.includes(key)) {
        createCollection(key);
      }
    }
  });


  const handleCollectionChange = (e: Event & { target: HTMLSelectElement }) => {
    const { value } = e.target;
    const isNew = value === '+cl';
    let title: string | null | undefined;

    if (!value) return;

    if (isNew) {
      title = prompt('Collection Title ?')?.trim();

      if (title) {
        createCollection(title);
      }
    } else {
      title = value;
    }

    if (title && store.actionsMenu) {
      const itemToAdd: CollectionItem = store.actionsMenu;
      addToCollection(title, itemToAdd, isNew ? 'addNew' : '');
    }

    _.close();
    e.target.selectedIndex = 0;
  };


  return (
    <li>
      <i class="ri-play-list-add-line"></i>
      <select
        tabindex="2"
        id="collectionSelector"
        onchange={handleCollectionChange}
      >
        <option value="">{t('collection_selector_add_to')}</option>
        <option value="+cl">{t('collection_selector_create_new')}</option>
        <option value="favorites">{t('collection_selector_favorites')}</option>
        <option value="listenLater">{t('collection_selector_listen_later')}</option>
        {
          listStore.addToCollectionOptions.map((v) => (
            <option value={v}>{v}</option>
          ))
        }
      </select>
    </li>
  );
}
