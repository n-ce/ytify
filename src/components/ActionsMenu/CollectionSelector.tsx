import { addToCollection, createCollection, getCollection, getCollectionsKeys, removeFromCollection } from '@lib/utils/library';
import { t } from '@lib/stores';
import { For, Show } from 'solid-js';

export default function(_: {
  close?: () => void,
  data: CollectionItem[]
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
    } else title = value;


    if (title && _.data) {
      if (title.startsWith('-cl'))
        removeFromCollection(value.slice(3), _.data.map(_ => _.id));
      else
        addToCollection(title, _.data);
    }

    if (_.close)
      _.close();
    e.target.selectedIndex = 0;
  };


  const getKeys = (add: boolean) => {
    if (!_.data || _.data.length === 0) {
      return [];
    }
    return getCollectionsKeys()
      .filter(k => {
        const itemIsIncluded = getCollection(k).includes(_.data[0].id);

        return add ? !itemIsIncluded : itemIsIncluded;
      });
  };

  return (
    <select
      class="ri-play-list-add-line"
      id="collectionSelector"
      onchange={handleCollectionChange}
      aria-label={t('collection_selector_add_to')}
    >
      <option value="" selected disabled>&#xf00f</option>
      <option value="+cl">{t('collection_selector_create_new')}</option>
      <Show when={getKeys(true).length}>
        <optgroup label="Add to Collection">
          <For each={getKeys(true)}>
            {(v) => <option value={v}>{v}</option>}
          </For>
        </optgroup>
      </Show>
      <Show when={getKeys(false).length}>
        <optgroup label="Remove from Collection">

          <For each={getKeys(false)}>
            {(v) => <option value={'-cl' + v}>{v}</option>}
          </For>
        </optgroup>
      </Show>
    </select>

  );
}
