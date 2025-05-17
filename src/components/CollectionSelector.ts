import { addToCollection, createCollection, getDB, reservedCollections } from '../lib/libraryUtils';
import { store } from '../lib/store';
import { i18n } from '../lib/utils';
import { html } from 'uhtml';

export default function(_: {
  collection: CollectionItem,
  close: () => void
}) {

  const initialKeys = Object.keys(getDB());
  store.addToCollectionOptions.length = 0;

  for (const key of initialKeys)
    if (!reservedCollections.includes(key))
      createCollection(key);

  return html`
    <li>
      <i class="ri-play-list-add-line"></i>
      <select
        tabindex="2"
        id="collectionSelector"
        @change=${(e: Event & { target: EventTarget & { value: string, selectedIndex: number } }) => {
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
        <option>${i18n('collection_selector_add_to')}</option>
        <option value="+cl">${i18n('collection_selector_create_new')}</option>
        <option value="favorites">${i18n('collection_selector_favorites')}</option>
        <option value="listenLater">${i18n('collection_selector_listen_later')}</option>
        ${store.addToCollectionOptions.map(v => html`
              <option value=${v}>${v}</option>
            `)
    }
      </select>
    </li>
  `;
}
