import {
  addToCollection,
  CACHED_COLLECTION,
  config,
  createCollection,
  getCollection,
  getCollectionsKeys,
  removeFromCollection,
} from "@utils";
import { t } from "@stores";
import { For, Show } from "solid-js";

export default function (_: { close?: () => void; data: TrackItem[] }) {
  const handleCollectionChange = (e: Event & { target: HTMLSelectElement }) => {
    const { value } = e.target;
    const isNew = value === "+cl";
    let title: string | null | undefined;

    if (!value) return;

    if (isNew) {
      title = prompt("Collection Title ?")?.trim();

      if (title) {
        createCollection(title);
      }
    } else title = value;

    if (title && _.data) {
      if (title.startsWith("-cl"))
        removeFromCollection(
          value.slice(3),
          _.data.map((_) => _.id),
        );
      else addToCollection(title, _.data);
    }

    if (_.close) _.close();
    e.target.selectedIndex = 0;
  };

  // The cached collection is stored under its own key, so it is offered
  // alongside the user collections whenever caching is enabled.
  const getKeys = (add: boolean) => {
    if (!_.data || _.data.length === 0) {
      return [];
    }

    const keys =
      config.cachingMode === "off"
        ? getCollectionsKeys()
        : [...getCollectionsKeys(), CACHED_COLLECTION];

    return keys.filter((k) => {
      const itemIsIncluded = getCollection(k).includes(_.data[0].id);
      return add ? !itemIsIncluded : itemIsIncluded;
    });
  };

  const label = (key: string) =>
    key === CACHED_COLLECTION ? t("hub_cached") : key;

  return (
    <select
      class="ri-play-list-add-fill"
      id="collectionSelector"
      onchange={handleCollectionChange}
      aria-label={t("collection_selector_add_to")}
    >
      <option value="" selected disabled>
        &#xf00e;
      </option>
      <option value="+cl">{t("collection_selector_create_new")}</option>
      <Show when={getKeys(true).length}>
        <optgroup label="Add to Collection">
          <For each={getKeys(true)}>
            {(v) => <option value={v}>{label(v)}</option>}
          </For>
        </optgroup>
      </Show>
      <Show when={getKeys(false).length}>
        <optgroup label="Remove from Collection">
          <For each={getKeys(false)}>
            {(v) => <option value={"-cl" + v}>{label(v)}</option>}
          </For>
        </optgroup>
      </Show>
    </select>
  );
}
