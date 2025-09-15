import { Show, createSignal } from 'solid-js';
import { getDB, getThumbIdFromLink, saveDB, toCollection } from '../../lib/utils';
import { listStore, setQueueStore, t } from '../../lib/stores';

export default function Dropdown() {
  const db = Object(getDB());
  const [isSubscribed, setSubscribed] = createSignal(
    db.hasOwnProperty(listStore.type) &&
    db[listStore.type].hasOwnProperty(listStore.id)
  );


  function subscriptionHandler() {

    const { name, type, id, uploader, thumbnail } = listStore;
    const db = getDB();
    if (isSubscribed()) {
      delete db[type + 's'][id];
    }
    else {
      const dataset: List & { uploader?: string } =
      {
        id, name,
        thumbnail: getThumbIdFromLink(thumbnail)
      };

      if (type === 'playlist')
        dataset.uploader = uploader;

      toCollection(type + 's', dataset, db);
    }
    setSubscribed(!isSubscribed());
    saveDB(db, 'subscribe');
  }
  return (
    <details>
      <summary><i class="ri-more-2-fill"></i></summary>
      <ul id="listTools">


        <li
          id="playAllBtn"
          onclick={() => {
            setQueueStore('list', []);
          }}
        >
          <i class="ri-play-large-line"></i>{t("list_play")}
        </li>

        <li id="enqueueAllBtn">
          <i class="ri-list-check-2"></i>{t("list_enqueue")}
        </li>

        <li id="importListBtn">
          <i class="ri-import-line"></i>{t("list_import")}
        </li>

        <li
          id="subscribeListBtn"
          onclick={subscriptionHandler}
        >
          <i class="ri-stack-line"></i>{isSubscribed() ? 'Subscribed' : 'Subscribe'}
        </li>

        <li id="viewOnYTBtn">
          <i class="ri-external-link-line"></i>{listStore.name || 'View on YouTube'}
        </li>

        <Show when={listStore.type === 'collection' && listStore.isReversed}>
          <li id="clearListBtn">
            <i class="ri-close-large-line"></i>{t("list_clear_all")}
          </li>
        </Show>


        <Show when={listStore.type === 'collection' && !listStore.isReversed}>

          <li id="deleteCollectionBtn">
            <i class="ri-delete-bin-2-line"></i>{t("list_delete")}
          </li>

          <li id="renameCollectionBtn">
            <i class="ri-edit-line"></i>{t("list_rename")}
          </li>

          <li id="shareCollectionBtn">
            <i class="ri-link"></i>{t("list_share")}
          </li>

          <li id="radioCollectionBtn">
            <i class="ri-radio-line"></i>{t("list_radio")}
          </li>

          <li
            id="sortCollectionBtn"
          >
            <i class="ri-draggable"></i>{t("list_sort")}
          </li>

          <li id="sortByTitleBtn">
            <i class="ri-sort-alphabet-asc"></i>{t("list_sort_title")}
          </li>

          <li id="sortByArtistBtn">
            <i class="ri-sort-asc"></i>{t("list_sort_author")}
          </li>

        </Show>
      </ul>
    </details>
  )
}
