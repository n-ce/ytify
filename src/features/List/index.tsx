import { createSignal, onMount, Show } from 'solid-js';
import './List.css';
import Sortable, { type SortableEvent } from 'sortablejs';
import { openFeature, listStore, resetList, setQueueStore, setListStore } from '@lib/stores';
import { getCollection, getTracksMap, metaUpdater, removeFromCollection } from '@lib/utils';
import Dropdown from './Dropdown';
import Results from './Results';

export default function() {
  let listSection!: HTMLElement;
  let listContainerRef: HTMLDivElement | undefined;
  const [markMode, setMarkMode] = createSignal(false);
  const [markList, setMarkList] = createSignal<string[]>([]);
  const [showStreamsNumber, setShowStreamsNumber] = createSignal(false);
  const [showSortMenu, setShowSortMenu] = createSignal(false);

  onMount(() => {
    openFeature('list', listSection);
    listSection.scrollTo(0, 0);

    if (listContainerRef) {
      new Sortable(listContainerRef, {
        handle: '.ri-draggable',
        onUpdate(e: SortableEvent) {
          if (e.oldIndex == null || e.newIndex == null) return;
          const collection = listStore.id;
          const dataArray = getCollection(collection);
          const [removedId] = dataArray.splice(e.oldIndex, 1);
          dataArray.splice(e.newIndex, 0, removedId);
          localStorage.setItem('library_' + collection, JSON.stringify(dataArray));
          metaUpdater(collection);
          const tracks = getTracksMap();
          setListStore('list', dataArray.map(id => tracks[id]));

        }
      });
    }


  });

  const MarkBar = () => (
    <div class="markBar">
      <i
        class={'ri-checkbox-multiple-fill'}
        onclick={() => {
          if (markList().length === listStore.list.length)
            setMarkList([]);
          else
            setMarkList(listStore.list.map(v => v.id));

        }}
      ></i>
      <i
        class="ri-indeterminate-circle-line"
        onclick={() => {
          removeFromCollection(listStore.name, markList());
        }}
      ></i>
      <i
        class="ri-list-check-2"
        onclick={() => {

          const listToEnqueue = markList().map(id => listStore.list.find(v => v.id === id)).filter(Boolean) as CollectionItem[];

          if (listToEnqueue.length)
            setQueueStore('list', (list) => [...list, ...listToEnqueue])

        }}
      ></i>
    </div >
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
            onclick={() => {
              setMarkMode(!markMode());
              if (!markMode())
                setMarkList([]);
            }}
          ></i>
          <i
            class="ri-close-large-line"
            onclick={resetList}
          ></i>
        </div>
        <Dropdown toggleSort={() => setShowSortMenu(!showSortMenu())} />
      </header>

      <Show when={showSortMenu()}>
        <span>
          <label for="sortMenu">Sort Order :</label>
          <select id="sortMenu">
            <option>Original</option>
            <option>Last Updated</option>
            <option>Name</option>
            <option>Artist</option>
            <option>Duration</option>
          </select>
        </span>

      </Show>
      <br />
      <Results
        ref={listContainerRef}
        draggable={showSortMenu()}
        mark={{
          mode: markMode,
          set: (id: string) => {
            setMarkList((prev) =>
              prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
            );
          },
          get: (id: string) => markList().includes(id)
        }}
      />
    </section>
  )
}
