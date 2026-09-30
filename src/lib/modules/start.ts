import {
  params,
  setNavStore,
  setStore,
  setPlayerStore,
  getList,
  setSearchStore,
  playerStore,
  t,
} from "@stores";
import {
  config,
  idFromURL,
  fetchCollection,
  player,
  setConfig,
  cleanseLibraryData,
} from "@utils";
import { getCachedTrackIds } from "@modules/audioCache";

export default async function () {
  // Handle /s/:id, /album/:id, /artist/:id, /channel/:id, /playlist/:id URLs by transforming them internally
  const pathParts = location.pathname.split("/");
  if (pathParts.length === 3) {
    const [, type, id] = pathParts;
    if (id) {
      if (type === "s") {
        params.set("s", id);
        history.replaceState({}, "", `/?s=${id}`);
      } else if (["album", "artist", "channel", "playlist"].includes(type)) {
        params.set(type, id);
        history.replaceState({}, "", `/?${type}=${id}`);
      }
    }
  }

  if (!params.size) {
    setNavStore("active", "search");
  }

  const { shareAction } = config;

  const collection = params.get("collection");
  const shared = params.get("si");
  const channel = params.get("channel");
  const playlist = params.get("playlist");
  const artist = params.get("artist");
  const album = params.get("album");

  if (collection || shared)
    fetchCollection(collection || shared, Boolean(shared));
  else if (channel) getList(channel, "channel");
  else if (playlist) getList(playlist, "playlist");
  else if (artist) getList(artist, "artist");
  else if (album) getList(album, "album");

  const q = params.get("q");
  if (q) {
    const f = params.get("f") || "all";
    setConfig("searchFilter", f);
    setSearchStore("query", q);
    setNavStore("active", "search");
  }

  const isPWA = idFromURL(params.get("url") || params.get("text"));
  const id = params.get("s") || isPWA;

  if (id) {
    if (isPWA && shareAction === "watch") {
      setPlayerStore("stream", "id", id);
      setPlayerStore("isWatching", true);
    } else {
      if (params.size === 1) setNavStore("player", "state", true);
      await player(id);
      const t = params.get("t");
      if (t) {
        playerStore.audio.currentTime = Number(t);
        setPlayerStore("currentTime", Number(t));
      }
    }
  }

  document.addEventListener("click", (e) => {
    const click = e.target as HTMLElement;
    const detail = document.querySelector("details:open");

    if (!detail?.firstElementChild?.contains(click))
      detail?.removeAttribute("open");
  });

  if (import.meta.env.PROD)
    await import("virtual:pwa-register").then((pwa) => {
      const handleUpdate = pwa.registerSW({
        async onNeedRefresh() {
          setStore("snackbar", `${t("updating")}`);
          setTimeout(() => handleUpdate(true), 1500);
        },
      });
    });

  cleanseLibraryData();

  // Must follow cleanseLibraryData, which can strip ids from the cached list.
  // Deletes OPFS files the cached collection no longer lists.
  getCachedTrackIds().catch(() => {});

  import("@modules/metadataFixer").then((m) => m.runMetadataFixer());

  if (config.dbsync) {
    import("@modules/cloudSync").then((m) => m.initSyncLifecycle());
  }
}
