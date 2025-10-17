import { createSignal, onMount, Show } from 'solid-js';
import './List.css';
import Sortable, { type SortableEvent } from 'sortablejs';
import { addToQueue, openFeature, listStore, resetList, setListStore, setNavStore, closeFeature } from '@lib/stores';
import { metaUpdater, removeFromCollection, saveCollection } from '@lib/utils/library';
import { setConfig, config } from '@lib/utils/config';
import Dropdown from './Dropdown';
import Results from './Results';
import { useSortedList } from './useSortedList';

type SortOrder = 'modified' | 'name' | 'artist' | 'duration';

export default function() {
  let listSection!: HTMLElement;
  let listContainerRef: HTMLDivElement | undefined;
  const [markMode, setMarkMode] = createSignal(false);
  const [markList, setMarkList] = createSignal<string[]>([]);
  const [showStreamsNumber, setShowStreamsNumber] = createSignal(false);
  const [showSortMenu, setShowSortMenu] = createSignal(false);
  const [localSortOrder, setLocalSortOrder] = createSignal<SortOrder>(config.sortOrder);

  const sortedList = useSortedList(localSortOrder);

  onMount(() => {
    openFeature('list', listSection);
    listSection.scrollTo(0, 0);
    closeFeature('home');

    if (listContainerRef) {
      new Sortable(listContainerRef, {
        handle: '.ri-draggable',
        onUpdate(e: SortableEvent) {
          if (e.oldIndex == null || e.newIndex == null) return;

          setListStore('list', (currentList) => {
            const newList = [...currentList];
            const [removedItem] = newList.splice(e.oldIndex!, 1);
            newList.splice(e.newIndex!, 0, removedItem);

            const collection = listStore.id;
            const dataArray = newList.map(item => item.id);
            saveCollection(collection, dataArray);
            metaUpdater(collection);

            return [...newList];
          });
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
          setListStore('list', l => l.filter(item => !markList().includes(item.id)));
        }}
      ></i>
      <i
        class="ri-list-check-2"
        onclick={() => {

          const listToEnqueue = markList().map(id => listStore.list.find(v => v.id === id)).filter(Boolean) as CollectionItem[];

          if (listToEnqueue.length) {
            addToQueue(listToEnqueue);
            setNavStore('queue', 'state', true);
          }

        }}
      ></i>
      <i class="ri-play-list-2-fill"
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
          <select id="sortMenu" onchange={(e) => {
            const newSortOrder = e.target.value as SortOrder;
            setLocalSortOrder(newSortOrder);
            setConfig('sortOrder', newSortOrder);
          }} value={localSortOrder()}>
            <option value="modified">Modified</option>
            <option value="name">Name</option>
            <option value="artist">Artist</option>
            <option value="duration">Duration</option>
          </select>
        </span>

      </Show>
      <br />
      <Results
        ref={listContainerRef}
        draggable={localSortOrder() === 'modified' && showSortMenu()}
        list={sortedList()}
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
