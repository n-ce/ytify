import { createSignal, onMount, Show } from 'solid-js';
import './List.css';
import Sortable, { type SortableEvent } from 'sortablejs';
import { openFeature, t, listStore, resetList } from '../../lib/stores';
import { getDB, saveDB } from '../../lib/utils';
import ListResults from './Results';
import Dropdown from './Dropdown';

export default function() {
  let listSection!: HTMLElement;
  let listContainer!: HTMLDivElement;
  const [markMode, setMarkMode] = createSignal(false);
  const [markList, setMarkList] = createSignal<CollectionItem[]>([]);
  const [showStreamsNumber, setShowStreamsNumber] = createSignal(false);

  onMount(() => {
    openFeature('list', listSection);
    listSection.scrollTo(0, 0);

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

  const MarkBar = () => (
    <div class="markBar">
      <i
        class={'ri-checkbox-multiple-fill'}
        onclick={() => console.log(true)}
      ></i>
      <i class="ri-indeterminate-circle-line"></i>
      <i class="ri-list-check-2"></i>

    </div>
  );

  return (
    <section ref={listSection} id="listSection">
      <header>
        <Show
          when={!markMode()}
          fallback={<MarkBar />}>
          <p
            onclick={() => setShowStreamsNumber(!showStreamsNumber())}
            id="listTitle"
          >{
              showStreamsNumber() ?
                `${listStore.length} streams` :
                listStore.name
            }</p>
        </Show>


        <div class="right-group">
          <i
            class={markMode() ? 'ri-checkbox-fill' : 'ri-checkbox-line'}
            onclick={() => setMarkMode(!markMode())}
          ></i>
          <i
            class="ri-close-large-line"
            onclick={resetList}
          ></i>
        </div>
        <Dropdown />
      </header>
      <br />
      <ListResults ref={listContainer} />
    </section>
  )
}
