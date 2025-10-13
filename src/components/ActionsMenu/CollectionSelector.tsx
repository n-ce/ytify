import { addToCollection, createCollection, getCollectionsKeys } from '@lib/utils/library';
import { store, t } from '@lib/stores';

export default function(_: {
  close: () => void
}) {


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
      addToCollection(title, [itemToAdd]);
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
          getCollectionsKeys().filter(k => !['favorites', 'listenLater'].includes(k)).map((v) => (
            <option value={v}>{v}</option>
          ))
        }
      </select>
    </li>
  );
}
