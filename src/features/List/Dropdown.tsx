import { Show, createSignal } from 'solid-js';
import { deleteCollection, getLists, saveLists } from '@lib/utils/library';
import { getThumbIdFromLink } from '@lib/utils/image';
import { listStore, resetList, setQueueStore, t } from '@lib/stores';
import { importList } from '@lib/modules/listUtils';

export default function Dropdown(_: {
  toggleSort: () => void
}) {
  const [isSubscribed, setSubscribed] = createSignal(
    listStore.type !== 'collection' &&
    listStore.id in getLists(listStore.type)
  );


  function subscriptionHandler() {

    const { name, type, id, uploader, thumbnail } = listStore;
    if (type === 'collection') return;

    const data = getLists(type);


    if (isSubscribed()) {
      delete data[id];
    }
    else {
      const dataset =
        {
          id, name,
          thumbnail: getThumbIdFromLink(thumbnail)
        } as Playlist;

      if (type === 'playlists')
        dataset.uploader = uploader;

      saveLists(type, data);
    }

    setSubscribed(!isSubscribed());
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

        <li onclick={importList} id="importListBtn">
          <i class="ri-import-line"></i>{t("list_import")}
        </li>

        <Show when={listStore.type === 'channels' || listStore.type === 'playlists'}>

          <li
            id="subscribeListBtn"
            onclick={subscriptionHandler}
          >
            <i class="ri-stack-line"></i>{isSubscribed() ? 'Subscribed' : 'Subscribe'}
          </li>

          <li id="viewOnYTBtn">
            <i class="ri-external-link-line"></i>{listStore.name || 'View on YouTube'}
          </li>
        </Show>

        <Show when={listStore.type === 'collection' && listStore.isReversed}>
          <li id="clearListBtn">
            <i class="ri-close-large-line"></i>{t("list_clear_all")}
          </li>
        </Show>


        <Show when={listStore.type === 'collection' && !listStore.isReversed}>

          <li id="deleteCollectionBtn" onclick={() => {
            const { id } = listStore;
            if (confirm(t("list_prompt_delete", id))) {
              deleteCollection(id);
              resetList();
            }
          }}>
            <i class="ri-delete-bin-2-line"></i>{t("list_delete")}
          </li>

          <li id="renameCollectionBtn">
            <i class="ri-edit-line"></i>{t("list_rename")}
          </li>

          <li id="shareCollectionBtn">
            <i class="ri-link"></i>{t("list_share")}
          </li>

          <li id="exportCollectionBtn">
            <i class="ri-export-line"></i>{t('list_export')}
          </li>

          <li id="radioCollectionBtn">
            <i class="ri-radio-line"></i>{t("list_radio")}
          </li>

          <li
            id="sortCollectionBtn"
            onclick={_.toggleSort}
          >
            <i class="ri-draggable"></i>{t("list_sort")}
          </li>

        </Show>
      </ul>
    </details>
  )
}
