import { createSignal, For, Show } from "solid-js";
import { fetchCollection, getDB } from "../../lib/utils";
import { listStore, t } from "../../lib/stores";
import StreamItem from "../../components/StreamItem";

export default function() {

  let searchBar!: HTMLInputElement;
  const [searchText, setSearchText] = createSignal('');

  const db = getDB();
  const keys = Object.keys(db);
  const data = (keys.length ?

    keys : listStore.reservedCollections)
    .filter(v => v !== 'channels' && v !== 'playlists')
    .map(v => ({ type: 'collection', name: v }));
  const reservedCollections = {
    discover: ['ri-compass-3-line', 'library_discover'],
    history: ['ri-memories-line', 'library_history'],
    favorites: ['ri-heart-fill', 'library_favorites'],
    listenLater: ['ri-calendar-schedule-line', 'library_listen_later']
  };

  function finder() {
    const toFind = searchText().toLowerCase();

    return keys
      .filter(k => !listStore.reservedCollections.includes(k))
      .map(key => Object.values(db[key]))
      .flat()
      .filter(v => {
        if (!('title' in v)) return false;
        const title = v.title.toLowerCase().includes(toFind);
        const author = v.author.toLowerCase().includes(toFind);

        return title || author;
      }) as CollectionItem[]

  }


  return (
    <>
      <input
        ref={searchBar}
        type="text"
        placeholder="Search Local Library"
        oninput={() => setSearchText(searchBar.value)}
      />
      <Show when={searchText()}>
        <For each={finder()}>
          {(item) => (
            <StreamItem
              id={item.id || ''}
              title={item.title || ''}
              author={item.author}
              duration={item.duration || ''}
              channelUrl={item.channelUrl}
              lastUpdated={item.lastUpdated}
            />
          )}
        </For>
      </Show>
      <Show when={!searchText()}>
        <For each={data}>
          {(item) => (
            <a
              href={'?collection=' + item.name}
              class='clxn_item'
              onclick={(e) => {
                e.preventDefault();
                fetchCollection(item.name);
              }}
            >{
                <Show
                  when={item.name in reservedCollections}
                  fallback={<><i class='ri-play-list-2-fill'></i>{item.name}</>
                  }
                >
                  <i class={reservedCollections[item.name as 'history'][0]}></i>
                  {t(reservedCollections[item.name as 'history'][1] as 'library_history')}
                </Show>
              }</a>
          )}

        </For>
      </Show>
    </>
  );
}
