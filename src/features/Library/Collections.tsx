import { createSignal, For, Show, createMemo } from "solid-js";
import { fetchCollection, getCollectionsKeys, getTracksMap, drawer } from "@utils";
import { t, setListStore, setNavStore } from "@stores";
import StreamItem from "@components/StreamItem";

export default function() {

  let searchBar!: HTMLInputElement;
  const [searchText, setSearchText] = createSignal('');
  const [debouncedSearchText, setDebouncedSearchText] = createSignal('');
  const [isTruncated, setIsTruncated] = createSignal(false);
  const [searchFn, setSearchFn] = createSignal<((searchTerm: string, tracksMap: Collection) => { results: TrackItem[]; isTruncated: boolean }) | null>(null);

  const loadFinder = async () => {
    if (searchFn()) return;
    const mod = await import("@modules/finder");
    setSearchFn(() => mod.default);
  };

  const tracksMap = createMemo(() => getTracksMap());

  let debounceTimer: NodeJS.Timeout;
  const handleInput = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      setDebouncedSearchText(searchBar.value);
    }, 300);
    setSearchText(searchBar.value);
  };

  if (localStorage.getItem('library')) {
    import('@modules/libraryMigrator')
      .then(m => m.default());
    return t('library_migration_in_place');
  }

  const reservedCollections = {
    history: ['ri-memories-fill', 'library_history'],
    favorites: ['ri-heart-fill', 'library_favorites'],
    listenLater: ['ri-calendar-schedule-fill', 'library_listen_later'],
    liked: ['ri-thumb-up-fill', 'library_liked']
  };

  if (getCollectionsKeys().length === 0) {
    for (const collection in reservedCollections) {
      localStorage.setItem('library_' + collection, '[]');
    }
  }

  const searchResults = createMemo(() => {
    const finder = searchFn();
    if (!finder) return [];
    const { results, isTruncated } = finder(debouncedSearchText(), tracksMap());
    setIsTruncated(isTruncated);
    return results;
  });


  return (
    <>
      <input
        ref={searchBar}
        type="text"
        placeholder={t('library_search_placeholder')}
        onInput={handleInput}
        onFocus={loadFinder}
      />
      <Show when={searchText()}>
        <For each={searchResults()}>
          {(item) => (
            <StreamItem
              id={item.id}
              title={item.title}
              author={item.author}
              duration={item.duration}
              authorId={item.authorId}
              type="video"
              context={{
                src: 'search',
                id: searchText()
              }}
            />
          )}
        </For>
        <Show when={isTruncated()}>
          <div class="truncated-message">{t('library_too_many_results')}</div>
        </Show>
      </Show>
      <Show when={!searchText()}>
        <Show when={getCollectionsKeys().length} fallback={t('library_empty')}>
          <For each={getCollectionsKeys()}>
            {(item) => (
              <a
                href={'?collection=' + item}
                class='clxn_item'
                onclick={(e) => {
                  e.preventDefault();
                  fetchCollection(item);
                }}
              >{<Show
                when={item in reservedCollections}
                fallback={<><i class='ri-play-list-2-fill'></i>{item}</>
                }
              >
                <i class={reservedCollections[item as 'history'][0]}></i>
                {t(reservedCollections[item as 'history'][1] as 'library_history')}
              </Show>
                }</a>
            )}

          </For>
        </Show>
        <a
          class='clxn_item'
          onclick={() => {
            const { libraryPlays } = drawer;
            const tracks = getTracksMap();
            const frequentlyPlayedItems = Object.keys(libraryPlays)
              .filter(id => libraryPlays[id] > 1 && tracks[id])
              .sort((a, b) => libraryPlays[b] - libraryPlays[a])
              .map(id => tracks[id]);
            setListStore({
              name: t('hub_frequently_played'),
              list: frequentlyPlayedItems as YTItem[],
            });
            setNavStore('list', 'state', true);
          }}
        >
          <i class="ri-bar-chart-2-fill"></i>
          {t('hub_frequently_played')}
        </a>
        <a
          class='clxn_item'
          onclick={() => {
            const discoveryItems = drawer.discovery || [];
            setListStore({
              name: t('hub_discovery'),
              list: discoveryItems as YTItem[],
            });
            setNavStore('list', 'state', true);
          }}
        >
          <i class="ri-compass-3-fill"></i>
          {t('hub_discovery')}
        </a>
      </Show>
    </>
  );
}
