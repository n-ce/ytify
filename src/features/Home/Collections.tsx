import { createSignal, For, Show, createMemo } from "solid-js";
import { fetchCollection, getCollectionsKeys, getTracksMap } from "@lib/utils";
import { t } from "@lib/stores";
import StreamItem from "@components/StreamItem";
import searchTracks from "@lib/modules/finder";

export default function() {

  let searchBar!: HTMLInputElement;
  const [searchText, setSearchText] = createSignal('');
  const [debouncedSearchText, setDebouncedSearchText] = createSignal('');
  const [isTruncated, setIsTruncated] = createSignal(false);

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
    import('@lib/modules/libraryMigrator')
      .then(m => m.default());
    return t('library_migration_in_place');
  }

  const reservedCollections = {
    history: ['ri-memories-line', 'library_history'],
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
    const { results, isTruncated } = searchTracks(debouncedSearchText(), tracksMap());
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
      </Show>
    </>
  );
}
