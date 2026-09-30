import { For, Show, lazy, onMount, createMemo } from "solid-js";
import "./Library.css";
import Collections from "./Collections";

import { getLibraryAlbums, getLists, librarySections } from "@utils";
import { t, setNavStore, store } from "@stores";
import ListItem from "@components/ListItem";
import HeaderActions from "@components/HeaderActions";
import HeaderNav from "@components/HeaderNav";

const Gallery = lazy(() => import("./Gallery"));
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

      <Show when={librarySections().gallery}>
        <Gallery />
      </Show>
      <Show when={librarySections().subfeed}>
        <SubFeed />
      </Show>
      <Show when={librarySections().featured}>
        <Featured />
      </Show>
      <Collections />
      <br />
      <Show when={libraryAlbums().length > 0}>
        <article>
          <p>
            <i class="ri-album-fill"></i>&nbsp;
            {t("library_albums")}
          </p>
          <div>
            <For each={libraryAlbums()}>
              {(item) => (
                <ListItem
                  name={item.name}
                  id={item.id}
                  img={item.img}
                  author={item.author}
                  type="album"
                />
              )}
            </For>
          </div>
        </article>
      </Show>
      <br />

      <Show when={libraryPlaylists().length > 0}>
        <article>
          <p>
            <i class="ri-youtube-fill"></i>&nbsp;
            {t("library_playlists")}
          </p>
          <div>
            <For each={libraryPlaylists()}>
              {(item) => (
                <ListItem
                  name={item.name}
                  id={item.id}
                  img={item.img}
                  author={item.author}
                  type="playlist"
                />
              )}
            </For>
          </div>
        </article>
      </Show>

      <br />
    </section>
  );
}
