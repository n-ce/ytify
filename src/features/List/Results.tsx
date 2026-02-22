import { Accessor, For, Show, lazy } from "solid-js";
import { listStore, loadAll, setListStore, t } from "@stores";
import StreamItem from "@components/StreamItem";
import { getCollection, metaUpdater, saveCollection } from "@utils";

const Sortable = lazy(() => import("solid-sortablejs"));

export default function Results(_: {
  draggable: boolean,
  mark?: {
    mode: Accessor<boolean>,
    set: (id: string) => void,
    get: (id: string) => boolean
  }
}) {

  const handleReorder = (newList: YTItem[]) => {
    setListStore('list', newList);
    
    if (listStore.type === 'collection') {
      const collectionId = listStore.id;
      const fullCollection = getCollection(collectionId);
      
      // Since we load from the beginning, newList represents the start of the collection
      const newIds = newList.map(i => i.id);
      const remainingIds = fullCollection.slice(newList.length);
      
      saveCollection(collectionId, [...newIds, ...remainingIds]);
      metaUpdater(collectionId);
    }
  };

  return (
    <Show
      when={!listStore.isLoading}
      fallback={<i class="ri-loader-3-line loading-spinner"></i>}
    >
      <div class="listContainer">
        <Show when={_.draggable} fallback={
          <For each={listStore.list}>{
            (item) =>
              <StreamItem
                {...{
                  ...item,
                  context: { id: listStore.name || listStore.id, src: listStore.type }
                }}
                draggable={false}
                mark={_.mark}
              />
          }
          </For>
        }>
          <Sortable
            items={listStore.list}
            setItems={handleReorder}
            idField="id"
            animation={150}
            handle=".ri-draggable"
          >
            {(item: YTItem) =>
              <StreamItem
                {...{
                  ...item,
                  context: { id: listStore.name || listStore.id, src: listStore.type }
                }}
                draggable={true}
                mark={_.mark}
              />
            }
          </Sortable>
        </Show>
        <Show when={listStore.type === 'playlists' && listStore.hasContinuation}>
          <button class="loadAllBtn" onclick={loadAll}>
            {t('list_load_all')}
          </button>
        </Show>
      </div>
    </Show>
  );
}
