import { For, Show, createMemo, createSignal, onCleanup } from "solid-js";
import { getTracksMap } from "@modules/library";
import { t, store } from "@stores";
import StreamItem from "@components/StreamItem";

export default function (props: { onQueryChange?: (query: string) => void }) {
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
    const value = searchBar.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      setDebouncedSearchText(value);
    }, 300);
    setSearchText(value);
    props.onQueryChange?.(value);
  };

  onCleanup(() => clearTimeout(debounceTimer));

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
    </>
  );
}
