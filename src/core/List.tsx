import { onMount } from 'solid-js';
import './list.css';
import { i18n } from '../lib/utils';

export default function(_: {
  close: () => void
}) {
  let listSection!: HTMLElement;
  onMount(() => {
    listSection.scrollIntoView({
      behavior: 'smooth',
    });
  });

  return (
    <section ref={listSection} id="listSection">
      <header>
        <p id="listTitle">Title</p>
        <details>
          <summary><i class="ri-more-2-fill"></i></summary>
          <ul id="listTools">
            <li id="playAllBtn">
              <i class="ri-play-large-line"></i>{i18n("list_play")}
            </li>
            <li id="enqueueAllBtn">
              <i class="ri-list-check-2"></i>{i18n("list_enqueue")}
            </li>
            <li id="importListBtn">
              <i class="ri-import-line"></i>{i18n("list_import")}
            </li>
            <li id="subscribeListBtn">
              <i class="ri-stack-line" data-state=" Subscribe"></i>
            </li>
            <li id="viewOnYTBtn">
              <i class="ri-external-link-line" data-state=" View on YouTube"></i>
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
      <div id="listContainer">
        <h1 data-translation="list_info">{i18n("list_info")}</h1>
      </div>
    </section>
  )
}
