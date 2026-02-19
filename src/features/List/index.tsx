import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import './List.css';
import Sortable, { type SortableEvent } from 'sortablejs';
import { addToQueue, listStore, resetList, setListStore, setNavStore, t } from '@lib/stores';
import { fetchCollection, metaUpdater, removeFromCollection, saveCollection } from '@lib/utils/library';
import { setConfig, config, drawer } from '@lib/utils/config';
import { generateImageUrl } from '@lib/utils';
import Dropdown from './Dropdown';
import Results from './Results';
import CollectionSelector from '@components/ActionsMenu/CollectionSelector';
import ListItem from '@components/ListItem'; // Added import

type SortBy = 'modified' | 'name' | 'artist' | 'duration';

export default function() {
  let listSection!: HTMLElement;
  let sortableRef: Sortable | undefined;

  const [markMode, setMarkMode] = createSignal(false);
  const [markList, setMarkList] = createSignal<string[]>([]);
  const [showStreamsNumber, setShowStreamsNumber] = createSignal(false);
  const [localSortBy, setLocalSortBy] = createSignal<SortBy>(config.sortBy);
  const [localSortOrder, setLocalSortOrder] = createSignal<'asc' | 'desc'>(config.sortOrder);
  const [showSortable, setShowSortable] = createSignal(false);

  function initSortable() {
    const listContainer = document.querySelector('.listContainer') as HTMLDivElement;
    sortableRef = new Sortable(listContainer, {
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

  onMount(() => {
    setNavStore('list', 'ref', listSection);
    listSection.scrollIntoView();
    listSection.scrollTo(0, 0);
    setNavStore(drawer.lastMainFeature as 'search' | 'library', 'state', false);
  });
  createEffect(() => {
    if (localSortBy() === 'modified' && showSortable() && !listStore.reservedCollections.includes(listStore.id)) {
      initSortable();
    } else {
      sortableRef?.destroy();
      sortableRef = undefined;
    }
  });
  onCleanup(() => {
    sortableRef?.destroy();
    sortableRef = undefined;
  });


  const MarkBar = () => (
    <div class="markBar">
      <i
        aria-label={t('list_mark_all')}
        class={'ri-checkbox-multiple-fill'}
        onclick={() => {
          if (markList().length === listStore.list.length)
            setMarkList([]);
          else
            setMarkList(listStore.list.map(v => v.id));
        }}
      ></i>
      <Show when={markList().length}>
        <Show when={listStore.type === 'collection'}>
          <i
            aria-label={t('list_remove_marked')}
            class="ri-indeterminate-circle-line"
            onclick={() => {
              removeFromCollection(listStore.name, markList());
            }}
          ></i>
        </Show>
        <i
          aria-label={t('list_enqueue_marked')}
          class="ri-list-check-2"
          onclick={() => {

            const listToEnqueue = markList().map(id => listStore.list.find(v => v.id === id)).filter(Boolean) as TrackItem[];

            if (listToEnqueue.length) {
              addToQueue(listToEnqueue);
              setNavStore('queue', 'state', true);
            }

          }}
        ></i>

        <i aria-label={t('collection_selector_add_to')}>
          <CollectionSelector data={markList().map(id => listStore.list.find(v => v.id === id)).filter(Boolean) as TrackItem[]
          } />
        </i>
      </Show>
    </div >
  );

  return (
    <section ref={listSection} id="listSection">
      <header class="sticky-bar">
        <Show
          when={!markMode()}
          fallback={<MarkBar />}>
          <p
            onclick={() => setShowStreamsNumber(!showStreamsNumber())}
            id="listTitle"
          >{
              showStreamsNumber() ?
                t('list_streams_count', listStore.length.toString()) :
                listStore.name
            }</p>
        </Show>


        <div class="right-group">
          <i
            aria-label={t('list_mark_mode')}
            aria-checked={markMode()}
            class={markMode() ? 'ri-checkbox-fill' : 'ri-checkbox-line'}
            onclick={() => {
              setMarkMode(!markMode());
              if (!markMode())
                setMarkList([]);
            }}
          ></i>
          <i
            aria-label={t('close')}
            class="ri-close-large-line"
            onclick={resetList}
          ></i>
        </div>
        <Dropdown />


      </header>


      <Show when={listStore.type === 'collection' && listStore.id && !listStore.reservedCollections.includes(listStore.id)}>
        <span class="sortBar">
          <label for="sortMenu">{t('list_sort_order')} :</label>
          <select id="sortMenu" onchange={(e) => {
            const newSortBy = e.target.value as SortBy;
            setLocalSortBy(newSortBy);
            setConfig('sortBy', newSortBy);
            fetchCollection(listStore.id);
          }} value={localSortBy()}>
            <option value="modified">{t('list_sort_modified')}</option>
            <option value="name">{t('list_sort_name')}</option>
            <option value="artist">{t('list_sort_artist')}</option>
            <option value="duration">{t('list_sort_duration')}</option>
          </select>
          <Show when={localSortBy() === 'modified' && !listStore.reservedCollections.includes(listStore.id)}>
            <i
              class="ri-draggable"
              classList={{ 'active': showSortable() }}
              onclick={() => setShowSortable(!showSortable())}
            ></i>
          </Show>
          <i
            class={localSortOrder() === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc'}
            onclick={() => {
              const newOrder = config.sortOrder === 'asc' ? 'desc' : 'asc';
              setConfig('sortOrder', newOrder);
              setLocalSortOrder(newOrder);
              fetchCollection(listStore.id);
            }}
          ></i>
        </span>

      </Show>

      <Show when={listStore.name.startsWith('Artist') && listStore.artistAlbums?.length}>
        <div class="list-carousel">
          <For each={listStore.artistAlbums}>
            {(album) => (
              <ListItem
                name={album.name}
                year={album.year}
                img={album.img}
                author={album.author}
                id={album.id}
                type='album'
              />
            )}
          </For>
        </div>
      </Show>

      <Show when={config.loadImage && listStore.id.startsWith('MPREb')}>
        <img src={generateImageUrl(listStore.img, '720')} alt={listStore.name} class="list-thumbnail" />
      </Show>

      <Results
        draggable={showSortable() && localSortBy() === 'modified' && !listStore.reservedCollections.includes(listStore.id)}
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
