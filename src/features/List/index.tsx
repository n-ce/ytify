import { createSignal, For, onMount } from 'solid-js';
import './list.css';
import Sortable, { type SortableEvent } from 'sortablejs';
import { openFeature, t } from '../../lib/stores';
import { getDB, getThumbIdFromLink, saveDB, toCollection } from '../../lib/utils';
import StreamItem from '../../components/StreamItem';
import { listStore } from '../../lib/stores/list';
import { setQueueStore } from '../../lib/stores/queue';

export default function() {
  let listSection!: HTMLElement;
  let listContainer!: HTMLDivElement;

  onMount(() => {
    openFeature('list', listSection);

    new Sortable(listContainer, {
      handle: '.ri-draggable',
      onUpdate(e: SortableEvent) {
        if (e.oldIndex == null || e.newIndex == null) return;
        const collection = listStore.id;
        const db = getDB();
        const dataArray = Object.entries(db[collection]);
        const [oldKey, oldItem] = dataArray.splice(e.oldIndex, 1)[0];
        dataArray.splice(
          e.newIndex, 0,
          [oldKey, oldItem]
        );
        db[collection] = Object.fromEntries(dataArray);
        saveDB(db);
      }
    });


  });

  const db = Object(getDB());
  const [isSubscribed, setSubscribed] = createSignal(
    db.hasOwnProperty(listStore.type) &&
    db[listStore.type].hasOwnProperty(listStore.id)
  );


  function subscriptionHandler() {

    const l = listStore;
    const db = getDB();
    if (isSubscribed()) {
      delete db[l.type][l.id];
    }
    else {
      const dataset: List & { uploader?: string } =
      {
        id: l.id,
        name: l.name,
        thumbnail: getThumbIdFromLink(l.thumbnail)
      };

      if (l.type === 'playlists')
        dataset.uploader = l.uploader;

      toCollection(l.type, dataset, db);
    }
    setSubscribed(!isSubscribed());
    saveDB(db, 'subscribe');
  }



  return (
    <section ref={listSection} id="listSection">
      <header>
        <p id="listTitle">Title</p>
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
              <i class="ri-external-link-line"></i>{
                listStore.name || 'View on YouTube'
              }
            </li>

            <li id="clearListBtn">
              <i class="ri-close-large-line"></i>{t("list_clear_all")}
            </li>

            <li id="removeFromListBtn">
              <i class="ri-indeterminate-circle-line"></i>{t("list_remove")}
            </li>

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

            <li id="sortCollectionBtn">
              <i class="ri-draggable"></i>{t("list_sort")}
            </li>

            <li id="sortByTitleBtn">
              <i class="ri-sort-alphabet-asc"></i>{t("list_sort_title")}
            </li>

            <li id="sortByArtistBtn">
              <i class="ri-sort-asc"></i>{t("list_sort_author")}
            </li>

          </ul>
        </details>
      </header>
      <br />
      <div
        id="listContainer"
        ref={listContainer}
      >
        <For
          each={Object.values(listStore.list)}
          fallback={<h1>{t("list_info")}</h1>}
        >{
            (item) =>
              <StreamItem
                id={item.id || ''}
                author={item.author}
                title={item.title || ''}
                duration={item.duration || ''}
                channelUrl={item.channelUrl}
              />
          }
        </For>

      </div>
    </section >
  )
}
