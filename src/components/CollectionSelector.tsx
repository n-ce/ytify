import { onMount } from "solid-js";
import { addToCollection, createCollection, getDB, reservedCollections } from "../lib/libraryUtils";
import { i18n } from "../lib/utils";

export default function CollectionSelector(_: {
  collection: CollectionItem,
  close: () => void
}) {


  onMount(() => {

    const initialKeys = Object.keys(getDB());

    for (const key of initialKeys)
      if (!reservedCollections.includes(key))
        createCollection(key);
  });

  return (
    <li>
      <i class="ri-play-list-add-line"></i>
      <select
        tabindex={2}
        id="collectionSelector"
        onchange={(e) => {
          const { value } = e.target;
          const isNew = value === '+cl';
          let title;

          if (!value) return;
          if (isNew) {
            title = prompt('Collection Title')?.trim();

            if (title)
              createCollection(title);
          }
          else title = value;

          if (title)
            addToCollection(title, _.collection, isNew ? 'addNew' : '');

          _.close();
          e.target.selectedIndex = 0;
        }}
      >
        <option>{i18n('collection_selector_add_to')}</option>
        <option value="+cl">{i18n('collection_selector_create_new')}</option>
        <option value="favorites">{i18n('collection_selector_favorites')}</option>
        <option value="listenLater">{i18n('collection_selector_listen_later')}</option>
      </select>
    </li>
  );
}
