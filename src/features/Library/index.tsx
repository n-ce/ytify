import { Show, lazy, onMount, createMemo } from "solid-js";
import "./Library.css";
import Collections from "./Collections";

import { librarySections } from "@config";
import { getLibraryAlbums, getLists } from "@modules/library";
import { t, setNavStore, store } from "@stores";
import Carousel from "@components/Carousel";
import HeaderActions from "@components/HeaderActions";
import HeaderNav from "@components/HeaderNav";

const SubFeed = lazy(() => import("./SubFeed"));
const Featured = lazy(() => import("./Featured"));

export default function () {
  let libraryRef!: HTMLElement;

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

  return (
    <section class="library" ref={libraryRef}>
      <header class="sticky-bar">
        <HeaderNav title={<p>{t("nav_library")}</p>} />
        <HeaderActions />
      </header>

      <Show when={librarySections().subfeed}>
        <SubFeed />
      </Show>
      <Show when={librarySections().featured}>
        <Featured />
      </Show>
      <Collections />
      <br />
      <Show when={libraryAlbums().length > 0}>
        <Carousel
          title={t("library_albums")}
          icon="ri-album-fill"
          items={libraryAlbums()}
          itemType="album"
        />
      </Show>
      <br />

      <Show when={libraryPlaylists().length > 0}>
        <Carousel
          title={t("library_playlists")}
          icon="ri-youtube-fill"
          items={libraryPlaylists()}
          itemType="playlist"
        />
      </Show>

      <br />
    </section>
  );
}
