import { createSignal, For, onMount, Show, onCleanup } from "solid-js";
import "./List.css";
import {
  addToQueue,
  listStore,
  resetList,
  setNavStore,
  t,
  setQueueStore,
  openSubView,
} from "@stores";
import {
  fetchCollection,
  removeFromCollection,
  setConfig,
  config,
  generateImageUrl,
  setDrawer,
  getCollectionItems,
  sortCollection,
} from "@utils";
import Dropdown from "./Dropdown";
import Results from "./Results";
import CollectionSelector from "@components/ActionsMenu/CollectionSelector";
import ListItem from "@components/ListItem";

type SortBy = "modified" | "name" | "artist" | "duration";

export default function () {
  let listSection!: HTMLElement;

  const [markMode, setMarkMode] = createSignal(false);
  const [isSearching, setIsSearching] = createSignal(false);
  const [markList, setMarkList] = createSignal<string[]>([]);
  const [showStreamsNumber, setShowStreamsNumber] = createSignal(false);
  const [localSortBy, setLocalSortBy] = createSignal<SortBy>(config.sortBy);
  const [localSortOrder, setLocalSortOrder] = createSignal<"asc" | "desc">(
    config.sortOrder,
  );
  const [showSortable, setShowSortable] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");

  const getSourceItems = () => {
    let source =
      listStore.type === "collection" && !listStore.isShared
        ? getCollectionItems(listStore.id)
        : (listStore.list as TrackItem[]);

    if (
      listStore.type === "collection" &&
      !listStore.reservedCollections.includes(listStore.id) &&
      (config.sortBy !== "modified" || config.sortOrder === "asc")
    ) {
      source = sortCollection(source, config.sortBy, config.sortOrder);
    }

    return source || [];
  };

  const filteredItems = () => {
    const rawQuery = searchQuery().trim();
    const source = getSourceItems();
    if (!rawQuery) return source;

    const query = rawQuery
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    return source.filter((item) => {
      if (!item) return false;
      const normalize = (str?: string) =>
        (str || "")
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase();
      return (
        normalize(item.title).includes(query) ||
        normalize(item.author).includes(query)
      );
    });
  };

  onMount(() => {
    setNavStore("list", "ref", listSection);
    listSection.scrollIntoView();
  });

  onCleanup(() => {
    if (listStore.id) {
      setDrawer("lastList", {
        id: listStore.id,
        type:
          listStore.type === "playlists"
            ? "playlist"
            : listStore.type === "channels"
              ? "channel"
              : listStore.type,
        shared: listStore.isShared,
      });
    }
    resetList();
  });

  const MarkBar = () => {
    const currentList = () =>
      searchQuery().trim() ? filteredItems() : getSourceItems();

    return (
      <div class="markBar">
        <i
          aria-label={t("list_mark_all")}
          class={"ri-checkbox-multiple-fill"}
          onclick={() => {
            const items = currentList();
            if (markList().length === items.length && items.length > 0)
              setMarkList([]);
            else setMarkList(items.map((v) => v.id));
          }}
        ></i>

        <Show when={listStore.type === "collection" && !listStore.isShared}>
          <i
            aria-label={t("list_remove_marked")}
            class="ri-indeterminate-circle-line"
            onclick={() => {
              removeFromCollection(listStore.id, markList());
              setMarkList([]);
            }}
          ></i>
        </Show>

        <Show when={markList().length}>
          <span>{markList().length}</span>
          <i
            aria-label={t("list_enqueue_marked")}
            class="ri-list-check-2"
            onclick={() => {
              const allSource = getSourceItems();
              const listToEnqueue = markList()
                .map((id) => allSource.find((v) => v.id === id))
                .filter(Boolean) as TrackItem[];

              if (listToEnqueue.length) {
                setQueueStore("history", []);
                addToQueue(listToEnqueue);
                openSubView("queue");
              }
            }}
          ></i>

          <i aria-label={t("collection_selector_add_to")}>
            <CollectionSelector
              data={
                markList()
                  .map((id) => getSourceItems().find((v) => v.id === id))
                  .filter(Boolean) as TrackItem[]
              }
            />
          </i>
        </Show>
      </div>
    );
  };

  return (
    <section ref={listSection} id="listSection">
      <header class="sticky-bar">
        <Show when={!markMode()} fallback={<MarkBar />}>
          <Show
            when={!isSearching()}
            fallback={
              <input
                ref={(el) => setTimeout(() => el?.focus(), 10)}
                autofocus
                type="text"
                class="listSearchInput"
                placeholder="Search within List"
                value={searchQuery()}
                oninput={(e) => {
                  setSearchQuery(e.currentTarget.value);
                }}
                onkeydown={(e) => {
                  if (e.key === "Escape") {
                    setIsSearching(false);
                    setSearchQuery("");
                  }
                }}
              />
            }
          >
            <p
              onclick={() => setShowStreamsNumber(!showStreamsNumber())}
              id="listTitle"
            >
              {showStreamsNumber()
                ? t("list_streams_count", listStore.length.toString())
                : listStore.name}
            </p>
          </Show>
        </Show>

        <div class="right-group">
          <i
            aria-label={t("list_mark_mode")}
            aria-checked={markMode()}
            class={markMode() ? "ri-checkbox-fill" : "ri-checkbox-line"}
            onclick={() => {
              const next = !markMode();
              setMarkMode(next);
              if (!next) setMarkList([]);
            }}
          ></i>
          <i
            aria-label={t("nav_search")}
            class={isSearching() ? "ri-close-line" : "ri-search-2-line"}
            onclick={() => {
              const next = !isSearching();
              setIsSearching(next);
              if (!next) setSearchQuery("");
            }}
          ></i>
        </div>
        <Dropdown />
      </header>

      <Show
        when={
          listStore.type === "collection" &&
          listStore.id &&
          !listStore.reservedCollections.includes(listStore.id)
        }
      >
        <span class="sortBar">
          <label for="sortMenu">{t("list_sort_order")} :</label>
          <select
            id="sortMenu"
            onchange={(e) => {
              const newSortBy = e.target.value as SortBy;
              setLocalSortBy(newSortBy);
              setConfig("sortBy", newSortBy);
              fetchCollection(listStore.id);
            }}
            value={localSortBy()}
          >
            <option value="modified">{t("list_sort_modified")}</option>
            <option value="name">{t("list_sort_name")}</option>
            <option value="artist">{t("list_sort_artist")}</option>
            <option value="duration">{t("list_sort_duration")}</option>
          </select>
          <Show
            when={
              localSortBy() === "modified" &&
              !listStore.reservedCollections.includes(listStore.id)
            }
          >
            <i
              class="ri-draggable"
              classList={{ active: showSortable() }}
              onclick={() => setShowSortable(!showSortable())}
            ></i>
          </Show>
          <i
            class={localSortOrder() === "asc" ? "ri-sort-asc" : "ri-sort-desc"}
            onclick={() => {
              const newOrder = config.sortOrder === "asc" ? "desc" : "asc";
              setConfig("sortOrder", newOrder);
              setLocalSortOrder(newOrder);
              fetchCollection(listStore.id);
            }}
          ></i>
        </span>
      </Show>

      <Show
        when={
          listStore.name.startsWith("Artist") && listStore.artistAlbums?.length
        }
      >
        <div class="list-carousel">
          <For each={listStore.artistAlbums}>
            {(album) => (
              <ListItem
                name={album.name}
                year={album.year}
                img={album.img}
                author={album.author}
                id={album.id}
                type="album"
              />
            )}
          </For>
        </div>
      </Show>

      <Show when={config.loadImage && listStore.id.startsWith("MPREb")}>
        <img
          src={generateImageUrl(listStore.img, "720")}
          alt={listStore.name}
          class="list-thumbnail"
        />
      </Show>

      <Results
        items={filteredItems()}
        draggable={
          showSortable() &&
          localSortBy() === "modified" &&
          !listStore.reservedCollections.includes(listStore.id) &&
          !isSearching()
        }
        mark={{
          mode: markMode,
          set: (id: string) => {
            setMarkList((prev) =>
              prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id],
            );
          },
          get: (id: string) => markList().includes(id),
        }}
      />
    </section>
  );
}
