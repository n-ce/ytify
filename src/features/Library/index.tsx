import {
  Show,
  lazy,
  onMount,
  createMemo,
  createSignal,
  createEffect,
} from "solid-js";
import "./Library.css";
import Collections from "./Collections";
import LocalSearch from "./LocalSearch";

import {
  config,
  setConfig,
  librarySections,
  type LibraryTab,
  type LibrarySort,
} from "@config";
import {
  getLibraryAlbums,
  getLists,
  getCollectionsKeys,
  RESERVED_COLLECTIONS,
} from "@modules/library";
import { t, setNavStore, store } from "@stores";
import { sortLibraryItems } from "@utils";
import Carousel from "@components/Carousel";
import ChoiceChips, { type ChoiceChipOption } from "@components/ChoiceChips";
import HeaderActions from "@components/HeaderActions";
import HeaderNav from "@components/HeaderNav";

const SubFeed = lazy(() => import("./SubFeed"));
const Featured = lazy(() => import("./Featured"));

export default function () {
  let libraryRef!: HTMLElement;

  const [activeTab, setActiveTab] = createSignal<LibraryTab>(config.libraryTab);
  const [sortMode, setSortMode] = createSignal<LibrarySort>(config.librarySort);
  const [isSearching, setIsSearching] = createSignal(false);

  onMount(() => {
    setNavStore("library", "ref", libraryRef);
    libraryRef.scrollIntoView();
  });

  const libraryAlbums = createMemo(() => {
    store.libraryUpdated;
    return getLibraryAlbums();
  });

  const libraryPlaylists = createMemo(() => {
    store.libraryUpdated;
    return getLists("playlists");
  });

  const myCollections = createMemo(() => {
    store.libraryUpdated;
    return getCollectionsKeys().filter(
      (item) => !(item in RESERVED_COLLECTIONS),
    );
  });

  const sortedPlaylists = createMemo(() =>
    sortLibraryItems(libraryPlaylists(), sortMode()),
  );

  const sortedAlbums = createMemo(() =>
    sortLibraryItems(libraryAlbums(), sortMode()),
  );

  const selectTab = (tab: LibraryTab) => {
    setActiveTab(tab);
    setConfig("libraryTab", tab);
  };

  const toggleSort = () => {
    const next = sortMode() === "name" ? "modified" : "name";
    setSortMode(next);
    setConfig("librarySort", next);
  };

  const tabs = createMemo<ChoiceChipOption<LibraryTab>[]>(() => {
    const sections = librarySections();
    const items: ChoiceChipOption<LibraryTab>[] = [
      {
        value: "quickAccess",
        label: t("library_quick_access"),
        icon: "ri-music-2-line",
      },
    ];

    if (myCollections().length > 0) {
      items.push({
        value: "myCollections",
        label: t("library_my_collections"),
        icon: "ri-play-list-2-fill",
      });
    }
    if (sections.subfeed) {
      items.push({
        value: "subfeed",
        label: t("hub_subfeed"),
        icon: "ri-tv-fill",
      });
    }
    if (sections.featured) {
      items.push({
        value: "featured",
        label: t("hub_featured"),
        icon: "ri-star-fill",
      });
    }
    if (libraryPlaylists().length > 0) {
      items.push({
        value: "playlists",
        label: t("library_playlists"),
        icon: "ri-youtube-fill",
      });
    }
    if (libraryAlbums().length > 0) {
      items.push({
        value: "albums",
        label: t("library_albums"),
        icon: "ri-album-fill",
      });
    }

    return items;
  });

  // A persisted tab can disappear when a shelf is emptied or disabled.
  createEffect(() => {
    if (!tabs().some((tab) => tab.value === activeTab())) {
      selectTab("quickAccess");
    }
  });

  return (
    <section class="library" ref={libraryRef}>
      <header class="sticky-bar">
        <HeaderNav title={<p>{t("nav_library")}</p>} />
        <HeaderActions />
      </header>

      <LocalSearch
        onQueryChange={(query) => setIsSearching(Boolean(query.trim()))}
      />

      <Show when={!isSearching()}>
        <div class="library-tabs-row">
          <button
            type="button"
            class="library-sort"
            aria-label={t(
              sortMode() === "name" ? "list_sort_name" : "list_sort_modified",
            )}
            onclick={toggleSort}
          >
            <i
              class={sortMode() === "name" ? "ri-sort-asc" : "ri-sort-desc"}
            ></i>
          </button>
          <ChoiceChips
            class="library-tabs"
            ariaLabel={t("nav_library")}
            options={tabs()}
            value={activeTab()}
            onSelect={selectTab}
          />
        </div>

        <Show when={activeTab() === "quickAccess"}>
          <Collections scope="quickAccess" sort={sortMode()} />
        </Show>

        <Show when={activeTab() === "myCollections"}>
          <Collections scope="myCollections" sort={sortMode()} />
        </Show>

        <Show when={activeTab() === "subfeed" && librarySections().subfeed}>
          <SubFeed />
        </Show>

        <Show when={activeTab() === "featured" && librarySections().featured}>
          <Featured />
        </Show>

        <Show
          when={activeTab() === "playlists" && libraryPlaylists().length > 0}
        >
          <Carousel items={sortedPlaylists()} itemType="playlist" wrap />
        </Show>

        <Show when={activeTab() === "albums" && libraryAlbums().length > 0}>
          <Carousel items={sortedAlbums()} itemType="album" wrap />
        </Show>
      </Show>
    </section>
  );
}
