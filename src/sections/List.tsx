import { createSignal, For, onMount } from 'solid-js';
import './list.css';
import { i18n } from '../lib/utils';
import Sortable, { type SortableEvent } from 'sortablejs';
import { setStore, store } from '../lib/store';
import { getDB, saveDB, toCollection } from '../lib/libraryUtils';
import { getThumbIdFromLink } from '../lib/visualUtils';
import StreamItem from '../components/StreamItem';

export default function(_: {
  close: () => void
}) {
  let listSection!: HTMLElement;
  let listContainer!: HTMLDivElement;

  onMount(() => {
    listSection.scrollIntoView({
      behavior: 'smooth',
    });

    new Sortable(listContainer, {
      handle: '.ri-draggable',
      onUpdate(e: SortableEvent) {
        if (e.oldIndex == null || e.newIndex == null) return;
        const collection = store.list.id;
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
    db.hasOwnProperty(store.list.type) &&
    db[store.list.type].hasOwnProperty(store.list.id)
  );


  function subscriptionHandler() {

    const l = store.list;
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
                setStore('queuelist', []);
              }}
            >
              <i class="ri-play-large-line"></i>{i18n("list_play")}
            </li>

            <li id="enqueueAllBtn">
              <i class="ri-list-check-2"></i>{i18n("list_enqueue")}
            </li>

            <li id="importListBtn">
              <i class="ri-import-line"></i>{i18n("list_import")}
            </li>

            <li
              id="subscribeListBtn"
              onclick={subscriptionHandler}
            >
              <i class="ri-stack-line"></i>{isSubscribed() ? 'Subscribed' : 'Subscribe'}
            </li>

            <li id="viewOnYTBtn">
              <i class="ri-external-link-line"></i>{
                store.list.name || 'View on YouTube'
              }
            </li>

            <li id="clearListBtn">
              <i class="ri-close-large-line"></i>{i18n("list_clear_all")}
            </li>

            <li id="removeFromListBtn">
              <i class="ri-indeterminate-circle-line"></i>{i18n("list_remove")}
            </li>

            <li id="deleteCollectionBtn">
              <i class="ri-delete-bin-2-line"></i>{i18n("list_delete")}
            </li>

            <li id="renameCollectionBtn">
              <i class="ri-edit-line"></i>{i18n("list_rename")}
            </li>

            <li id="shareCollectionBtn">
              <i class="ri-link"></i>{i18n("list_share")}
            </li>

            <li id="radioCollectionBtn">
              <i class="ri-radio-line"></i>{i18n("list_radio")}
            </li>

            <li id="sortCollectionBtn">
              <i class="ri-draggable"></i>{i18n("list_sort")}
            </li>

            <li id="sortByTitleBtn">
              <i class="ri-sort-alphabet-asc"></i>{i18n("list_sort_title")}
            </li>

            <li id="sortByArtistBtn">
              <i class="ri-sort-asc"></i>{i18n("list_sort_author")}
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
          each={store.list.data}
          fallback={<h1>{i18n("list_info")}</h1>}
        >{
            (item) =>
              <StreamItem
                id={item.id}
                author={item.author}
                title={item.title}
                duration={item.duration}
                channelUrl={item.channelUrl}
              />
          }
        </For>

      </div>
    </section >
  )
}
