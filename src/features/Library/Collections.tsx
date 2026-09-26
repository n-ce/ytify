import { createSignal, For, Show, createMemo } from "solid-js";
import {
  CACHED_COLLECTION,
  DISCOVERY_COLLECTION,
  fetchCollection,
  getCollectionsKeys,
  getTracksMap,
  librarySections,
  RESERVED_COLLECTIONS,
  RESERVED_ORDER,
  cachingMode,
  type LibrarySectionKey,
} from "@utils";
import { t, store } from "@stores";
import StreamItem from "@components/StreamItem";

export default function () {
  let searchBar!: HTMLInputElement;
  const [searchText, setSearchText] = createSignal("");
  const [debouncedSearchText, setDebouncedSearchText] = createSignal("");
  const [isTruncated, setIsTruncated] = createSignal(false);
  const [searchFn, setSearchFn] = createSignal<
    | ((
        searchTerm: string,
        tracksMap: Collection,
      ) => { results: TrackItem[]; isTruncated: boolean })
    | null
  >(null);

  const loadFinder = async () => {
    if (searchFn()) return;
    const mod = await import("@modules/finder");
    setSearchFn(() => mod.default);
  };

  const tracksMap = createMemo(() => {
    store.libraryUpdated;
    return getTracksMap();
  });

  let debounceTimer: NodeJS.Timeout;
  const handleInput = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      setDebouncedSearchText(searchBar.value);
    }, 300);
    setSearchText(searchBar.value);
  };

  if (getCollectionsKeys().length === 0) {
    for (const collection of RESERVED_ORDER) {
      localStorage.setItem("library_" + collection, "[]");
    }
  }

  // Reserved collection names match their librarySections key, so the
  // per-section toggles in the configure modal drive visibility directly.
  const isCollectionVisible = (item: string) => {
    const sections = librarySections();
    return item in sections
      ? Boolean(sections[item as LibrarySectionKey])
      : true;
  };

  const visibleCollections = createMemo(() => {
    store.libraryUpdated;
    return getCollectionsKeys().filter(isCollectionVisible);
  });

  const showCached = createMemo(
    () => cachingMode() !== "off" && librarySections().cached,
  );

  const hasVisibleItems = createMemo(
    () =>
      visibleCollections().length > 0 ||
      showCached() ||
      librarySections().discovery,
  );

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
        placeholder={t("library_search_placeholder")}
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
                src: "search",
                id: searchText(),
              }}
            />
          )}
        </For>
        <Show when={isTruncated()}>
          <div class="truncated-message">{t("library_too_many_results")}</div>
        </Show>
      </Show>
      <Show when={!searchText()}>
        <Show when={hasVisibleItems()} fallback={t("library_empty")}>
          <For each={visibleCollections()}>
            {(item) => (
              <a
                href={"?collection=" + item}
                class="clxn_item"
                onclick={(e) => {
                  e.preventDefault();
                  fetchCollection(item);
                }}
              >
                <Show
                  when={item in RESERVED_COLLECTIONS}
                  fallback={
                    <>
                      <i class="ri-play-list-2-fill"></i>
                      {item}
                    </>
                  }
                >
                  <i class={RESERVED_COLLECTIONS[item][0]}></i>
                  {t(RESERVED_COLLECTIONS[item][1])}
                </Show>
              </a>
            )}
          </For>
          <Show when={showCached()}>
            <a
              href={"?collection=" + CACHED_COLLECTION}
              class="clxn_item"
              onclick={(e) => {
                e.preventDefault();
                fetchCollection(CACHED_COLLECTION);
              }}
            >
              <i class={RESERVED_COLLECTIONS[CACHED_COLLECTION][0]}></i>
              {t(RESERVED_COLLECTIONS[CACHED_COLLECTION][1])}
            </a>
          </Show>
          <Show when={librarySections().discovery}>
            <a
              href={"?collection=" + DISCOVERY_COLLECTION}
              class="clxn_item"
              onclick={(e) => {
                e.preventDefault();
                fetchCollection(DISCOVERY_COLLECTION);
              }}
            >
              <i class={RESERVED_COLLECTIONS[DISCOVERY_COLLECTION][0]}></i>
              {t(RESERVED_COLLECTIONS[DISCOVERY_COLLECTION][1])}
            </a>
          </Show>
        </Show>
      </Show>
    </>
  );
}
