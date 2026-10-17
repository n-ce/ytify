import { For, Show, createMemo } from "solid-js";
import { searchStore } from "@stores";
import { config } from "@utils";
import ListItem from "@components/ListItem";
import StreamItem from "@components/StreamItem";

export default function SearchResults() {
  const isAllFilter = () => config.searchFilter === "all";
  const carouselItems = createMemo(() =>
    isAllFilter()
      ? searchStore.results.filter(
          (i) =>
            i.type === "channel" ||
            i.type === "artist" ||
            i.type === "playlist",
        )
      : [],
  );
  const streamResults = createMemo(() =>
    isAllFilter()
      ? searchStore.results.filter(
          (i) =>
            i.type !== "channel" &&
            i.type !== "artist" &&
            i.type !== "playlist",
        )
      : searchStore.results,
  );

  return (
    <>
      <Show when={searchStore.isLoading}>
        <i class="ri-loader-3-line loading-spinner"></i>
      </Show>

      <Show when={carouselItems().length > 0}>
        <div class="list-carousel">
          <For each={carouselItems()}>
            {(item) => <ListItem {...(item as YTListItem)} />}
          </For>
        </div>
      </Show>

      <div class="searchlist">
        <For each={streamResults()}>
          {(item) => (
            <Show
              when={item.type === "video" || item.type === "song"}
              fallback={<ListItem {...(item as YTListItem)} />}
            >
              <StreamItem
                {...{
                  ...(item as YTItem),
                  context: {
                    src: "search",
                    id: searchStore.query,
                  },
                }}
              />
            </Show>
          )}
        </For>
      </div>
    </>
  );
}
