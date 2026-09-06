import { For, Show, lazy, onMount, createMemo } from "solid-js";
import "./Library.css";
import Collections from "./Collections";

import {
  getLibraryAlbums,
  config,
  getMeta,
  getLists,
  librarySections,
} from "@utils";
import { t, setNavStore, store } from "@stores";
import ListItem from "@components/ListItem";
import Dropdown from "./Dropdown";

const Gallery = lazy(() => import("./Gallery"));
const SubFeed = lazy(() => import("./SubFeed"));

export default function () {
  let libraryRef!: HTMLElement;
  let syncBtn!: HTMLElement;

  if (getMeta().version === 4)
    import("@modules/libraryMigratorV5").then((m) => m.default());
  else
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
        <p>{t("nav_library")}</p>

        <div class="right-group">
          <Show when={config.dbsync}>
            <i
              id="syncNow"
              classList={{
                "ri-cloud-fill": store.syncState === "synced",
                "ri-loader-3-line loading-spinner":
                  store.syncState === "syncing",
                "ri-cloud-off-fill":
                  store.syncState === "dirty" || store.syncState === "error",
                error: store.syncState === "error",
              }}
              aria-label={
                store.syncState === "dirty" || store.syncState === "error"
                  ? "Save to Cloud"
                  : store.syncState === "synced"
                    ? "Import from Cloud"
                    : "Syncing"
              }
              ref={syncBtn}
              onclick={() => {
                import("@modules/cloudSync").then(({ runSync }) => {
                  runSync(config.dbsync);
                });
              }}
            ></i>
          </Show>
        </div>

        <Dropdown />
      </header>

      <Show when={librarySections().gallery}>
        <Gallery />
      </Show>
      <Show when={librarySections().subfeed}>
        <SubFeed />
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
