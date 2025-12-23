import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import './List.css';
import Sortable, { type SortableEvent } from 'sortablejs';
import { addToQueue, listStore, resetList, setListStore, setNavStore, t } from '@lib/stores';
import { fetchCollection, metaUpdater, removeFromCollection, saveCollection } from '@lib/utils/library';
import { setConfig, config } from '@lib/utils/config';
import { generateImageUrl, getThumbIdFromLink } from '@lib/utils';
import Dropdown from './Dropdown';
import Results from './Results';
import CollectionSelector from '@components/ActionsMenu/CollectionSelector';
import ListItem from '@components/ListItem'; // Added import

type SortOrder = 'modified' | 'name' | 'artist' | 'duration';

export default function() {
  let listSection!: HTMLElement;
  let sortableRef: Sortable | undefined;

  const [markMode, setMarkMode] = createSignal(false);
  const [markList, setMarkList] = createSignal<string[]>([]);
  const [showStreamsNumber, setShowStreamsNumber] = createSignal(false);
  const [showSortMenu, setShowSortMenu] = createSignal(false);
  const [localSortOrder, setLocalSortOrder] = createSignal<SortOrder>(config.sortOrder);

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
    setNavStore('home', 'state', false);
  });
  createEffect(() => {
    if (localSortOrder() === 'modified' && showSortMenu()) {
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

            const listToEnqueue = markList().map(id => listStore.list.find(v => v.id === id)).filter(Boolean) as CollectionItem[];

            if (listToEnqueue.length) {
              addToQueue(listToEnqueue);
              setNavStore('queue', 'state', true);
            }

          }}
        ></i>

        <i aria-label={t('collection_selector_add_to')}>
          <CollectionSelector data={markList().map(id => listStore.list.find(v => v.id === id)).filter(Boolean) as CollectionItem[]
          } />
        </i>
      </Show>
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
        <Dropdown toggleSort={() => setShowSortMenu(!showSortMenu())} />
      </header>


      <Show when={showSortMenu()}>
        <span>
          <label for="sortMenu">{t('list_sort_order')} :</label>
          <select id="sortMenu" onchange={(e) => {
            const newSortOrder = e.target.value as SortOrder;
            setLocalSortOrder(newSortOrder);
            setConfig('sortOrder', newSortOrder);
            fetchCollection(listStore.id);
          }} value={localSortOrder()}>
            <option value="modified">{t('list_sort_modified')}</option>
            <option value="name">{t('list_sort_name')}</option>
            <option value="artist">{t('list_sort_artist')}</option>
            <option value="duration">{t('list_sort_duration')}</option>
          </select>
        </span>

      </Show>
      <Show when={listStore.name.startsWith('Artist') && listStore.artistAlbums?.length}>
        <div class="albums-carousel">
          <For each={listStore.artistAlbums}>
            {(album) => (
              <ListItem
                title={album.title}
                stats={album.subtitle}
                thumbnail={generateImageUrl(getThumbIdFromLink(album.thumbnail), '')}
                uploaderData={listStore.name.replace('Artist - ', '')}
                url={`/playlist/${album.id}`}
              />
            )}
          </For>
        </div>
      </Show>

      <Show when={config.loadImage && listStore.name.startsWith('Album')}>
        <img src={listStore.thumbnail.replace('w=360', 'w=720')} alt={listStore.name} class="list-thumbnail" />
      </Show>

      <Results
        draggable={localSortOrder() === 'modified' && showSortMenu()}
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
