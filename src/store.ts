import { Component, createRoot, lazy } from "solid-js";
import { createStore } from "solid-js/store";
import {
  shuffle,
  convertSStoHHMMSS,
  parseDuration,
  clamp,
  isTopicAuthor,
  normalizeAuthorKey,
  pickImage,
  withTopicSuffix,
} from "@utils";
import { config, playerBackground, setConfig, VOLUME_PRESETS, drawer, setDrawer } from "@config";
import { addToCollection, recordTrackPlay, cacheTrackOnFinished, getLibraryAlbums } from "@modules/library";
import { player } from "@modules/playback";
import { cssVar, themer } from "@modules/theme";
import { checkSponsorBlock, clearSponsorSegments } from "@modules/sponsorBlock";

const nl =
  typeof navigator !== "undefined" && navigator.language
    ? navigator.language.slice(0, 2)
    : "en";
const hasLocales = typeof Locales !== "undefined";
const initLocale =
  config.language || (hasLocales && Locales.includes(nl) ? nl : "en");

const storeInit: {
  useSaavn: boolean;
  api: string;
  updater?: () => void;
  actionsMenu?: TrackItem & { albumId?: string };
  snackbar?: string;
  syncState?: SyncState;
  locale: string;
  translations: Record<TranslationKeys, string> | {};
  libraryUpdated: number;
} = {
  api: import.meta.env.DEV ? "" : "https://api.ytify.workers.dev",
  useSaavn: true,
  locale: initLocale,
  translations: {},
  libraryUpdated: 0,
};

export const [store, setStore] = createStore(storeInit);

export function t(key: TranslationKeys, value: string = ""): string {
  const translations = store.translations as Record<TranslationKeys, string>;
  const translatedString = translations[key] || (key as string);
  return value ? translatedString.replace("$", value) : translatedString;
}

export async function updateLang() {
  document.documentElement.lang = store.locale;

  const json = await import(`./locales/${store.locale}.json`);

  setStore("translations", json.default);
  return true;
}

const Search = lazy(() => import("@features/Search"));
const Library = lazy(() => import("@features/Library"));
const List = lazy(() => import("@features/List"));
const Queue = lazy(() => import("@features/Queue"));
const Player = lazy(() => import("@features/Player"));
const Settings = lazy(() => import("@features/Settings"));

export const params = new URL(
  typeof location !== "undefined" ? location.href : "https://ytify.app/",
).searchParams;

export type MainFeature = "queue" | "search" | "library" | "list" | "settings";
type SidePanel = "player";

type Nav = {
  [key in MainFeature]: {
    ref: HTMLElement | null;
    component: Component<any>;
  };
} & {
  [key in SidePanel]: {
    ref: HTMLElement | null;
    state: boolean;
    component: Component<any>;
  };
};

export const [navStore, setNavStore] = createStore<
  Nav & { active: MainFeature }
>({
  active: "search",
  player: { ref: null, state: false, component: Player },
  queue: { ref: null, component: Queue },
  search: { ref: null, component: Search },
  library: { ref: null, component: Library },
  list: { ref: null, component: List },
  settings: { ref: null, component: Settings },
});

function getCleanHref(targetFeature: MainFeature): string {
  if (typeof location === "undefined") return "";
  const url = new URL(location.href);
  url.searchParams.delete("library");
  params.delete("library");

  let query = url.searchParams.toString();
  if (targetFeature === "library") {
    params.set("library", "");
    query = query ? `${query}&library` : "library";
  }
  return url.pathname + (query ? `?${query}` : "") + url.hash;
}

export function openSubView(feature: MainFeature) {
  if (feature === "search") {
    if (typeof history !== "undefined") {
      history.replaceState(
        { ...(history.state || {}), panel: null },
        "",
        getCleanHref("search"),
      );
    }
    setNavStore("active", "search");
    return;
  }
  if (navStore.active !== feature) {
    if (typeof history !== "undefined") {
      const href = getCleanHref(feature);
      history.pushState({ panel: feature }, "", href);
    }
    setNavStore("active", feature);
  }
}

export function closeSubView() {
  if (typeof history !== "undefined" && history.state?.panel) {
    history.back();
  } else {
    if (typeof history !== "undefined") {
      history.replaceState(
        { ...(history.state || {}), panel: null },
        "",
        getCleanHref("search"),
      );
    }
    setNavStore("active", "search");
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", (e) => {
    if (e.state?.panel) {
      if (e.state.panel === "library") {
        params.set("library", "");
      } else {
        params.delete("library");
      }
      setNavStore("active", e.state.panel);
    } else {
      params.delete("library");
      setNavStore("active", "search");
    }
  });
}

type Params =
  | "q"
  | "s"
  | "f"
  | "collection"
  | "playlist"
  | "channel"
  | "artist"
  | "album"
  | "si"
  | "t";

const listParams: Params[] = [
  "playlist",
  "channel",
  "artist",
  "album",
  "collection",
  "si",
];

export function updateParam(param: Params, value?: string) {
  if (value) {
    if (listParams.includes(param)) {
      listParams.forEach((p) => params.delete(p));
      params.delete("q");
      params.delete("f");
      params.delete("library");
    }
    if (param === "q" || param === "f") {
      listParams.forEach((p) => params.delete(p));
      params.delete("library");
    }
    params.set(param, value);
  } else params.delete(param);

  params.delete("library");
  let str = params.toString();
  if (navStore.active === "library") {
    params.set("library", "");
    str = str ? `${str}&library` : "library";
  }

  if (typeof history !== "undefined" && typeof location !== "undefined") {
    history.replaceState(
      history.state || {},
      "",
      location.origin + location.pathname + (str && "?") + str,
    );
  }
}

const blankImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

type PlayerStore = {
  stream: TrackItem & { albumId?: string };
  audio: HTMLAudioElement;
  context: {
    src: Context;
    id: string;
  };
  currentTime: number;
  fullDuration: number;
  playbackRate: number;
  loop: boolean;
  volume: number;
  status: string;
  playbackState: "none" | "playing" | "paused" | "loading";
  mediaArtwork: string;
  supportsOpus: Promise<boolean>;
  data: {};
  isMusic: boolean;
  audioURL: string;
  videoURL: string;
  isWatching: boolean;
  saveProgress: boolean;
  proxy: string;
  lrcSync?: (d: number) => void;
};

const createAudioElement = (): HTMLAudioElement => {
  if (typeof Audio !== "undefined") return new Audio();
  return {
    volume: 1,
    currentTime: 0,
    playbackRate: 1,
    loop: false,
    src: "",
    duration: 0,
    play: async () => {},
    pause: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLAudioElement;
};

const createPlayerInitialState = (): PlayerStore => ({
  audio: createAudioElement(),
  playbackState: "none",
  context: { id: "", src: "" },
  status: "",
  currentTime: 0,
  fullDuration: 0,
  playbackRate: 1.0,
  loop: false,
  volume: parseFloat(config.volume) / 100,
  stream: {
    title: "",
    author: "",
    authorId: "",
    id: "",
    duration: "",
  },
  mediaArtwork: blankImage,
  supportsOpus:
    typeof navigator !== "undefined" && navigator.mediaCapabilities
      ? navigator.mediaCapabilities
          .decodingInfo({
            type: "file",
            audio: {
              contentType: "audio/webm;codecs=opus",
            },
          })
          .then((res) => res.supported)
      : Promise.resolve(false),
  data: {},
  isMusic: true,
  audioURL: "",
  videoURL: "",
  isWatching: Boolean(config.watchMode),
  saveProgress: Boolean(params.get("t")),
  proxy: "",
});

export const [playerStore, setPlayerStore] = createStore(
  createPlayerInitialState(),
);

export function playNext() {
  const { stream } = playerStore;
  const { list } = queueStore;
  const nextStream = list[0];

  if (!nextStream) return;

  if (stream.id) setQueueStore("history", (h) => [{ ...stream }, ...h]);

  setPlayerStore("stream", nextStream);
  setPlayerStore("context", {
    id: nextStream.context?.id || "",
    src: nextStream.context?.src || "",
  });
  setQueueStore("list", (l) => {
    let newList = l.slice(1);
    if (newList.length > 1) {
      if (config.persistentShuffle) newList = shuffle(newList);
      if (config.authorGrouping) newList = groupQueueByAuthor(newList);
    }
    return newList;
  });
  player(nextStream.id);
}
export function playPrev() {
  const { stream } = playerStore;
  const { history } = queueStore;

  const prevStream = history[0];
  if (!prevStream) return;

  setQueueStore("history", (h) => h.slice(1));
  if (stream.id) setQueueStore("list", (l) => [{ ...stream }, ...l]);

  setPlayerStore("stream", prevStream);
  setPlayerStore("context", {
    id: prevStream.context?.id || "",
    src: prevStream.context?.src || "",
  });
  player(prevStream.id);
}
export function setVolume(volume: number) {
  const vol = clamp(volume, 0, 1);
  playerStore.audio.volume = vol;
  setPlayerStore("volume", vol);
  setConfig("volume", (vol * 100).toString());
}

export function stepVolume(direction: 1 | -1) {
  const current = playerStore.volume * 100;
  const next =
    direction > 0
      ? VOLUME_PRESETS.find((preset) => preset > current)
      : VOLUME_PRESETS.findLast((preset) => preset < current);
  setVolume((next ?? (direction > 0 ? 100 : 0)) / 100);
}

let lastAudibleVolume = playerStore.volume > 0 ? playerStore.volume : 1;

export function toggleMute() {
  if (playerStore.volume > 0) {
    lastAudibleVolume = playerStore.volume;
    playerStore.audio.volume = 0;
    setPlayerStore("volume", 0);
  } else {
    setVolume(lastAudibleVolume);
  }
}

createRoot(() => {
  let historyID: string | undefined = "";
  let historyTimeoutId = 0;
  let playCountedForTrackId = "";

  if (typeof navigator !== "undefined" && "mediaSession" in navigator)
    import("@modules/mediaSession").then((m) => m.initMediaSession());

  playerStore.audio.volume = playerStore.volume;

  playerStore.audio.onended = () => {
    cacheTrackOnFinished(playerStore.stream);
    if (queueStore.list.length) playNext();
    else {
      updateParam("s");
      updateParam("t");
      setPlayerStore("saveProgress", false);
      setPlayerStore("playbackState", "none");
      clearSponsorSegments();
      if (typeof navigator !== "undefined" && "mediaSession" in navigator)
        import("@modules/mediaSession").then((m) =>
          m.updateMediaSessionPlaybackState("none"),
        );
    }
  };

  playerStore.audio.onplaying = () => {
    setPlayerStore("playbackState", "playing");
    if (typeof navigator !== "undefined" && "mediaSession" in navigator)
      import("@modules/mediaSession").then((m) => {
        m.updateMediaSessionPlaybackState("playing");
        m.updateMediaSessionPosition();
      });

    const { stream } = playerStore;
    const { id } = stream;

    if (id && playCountedForTrackId !== id) {
      clearTimeout(historyTimeoutId);
      historyTimeoutId = setTimeout(() => {
        if (historyID === id && playCountedForTrackId !== id) {
          playCountedForTrackId = id;
          recordTrackPlay(playerStore.stream);

          if (config.similarContent && playerStore.isMusic)
            getRecommendations();

          if (config.history) {
            addToCollection("history", [playerStore.stream]);
          }
        }
      }, 1e4) as unknown as number;
    }
  };

  playerStore.audio.onpause = () => {
    setPlayerStore("playbackState", "paused");
    if (typeof navigator !== "undefined" && "mediaSession" in navigator)
      import("@modules/mediaSession").then((m) => {
        m.updateMediaSessionPlaybackState("paused");
        m.updateMediaSessionPosition();
      });
    clearTimeout(historyTimeoutId);
  };
  if (typeof playerStore.audio.addEventListener === "function") {
    playerStore.audio.addEventListener("loadeddata", themer);
  }

  let isPlayable = false;
  const playableCheckerID = setInterval(() => {
    if (
      queueStore.history.length ||
      params.has("url") ||
      params.has("text") ||
      !params.has("s")
    ) {
      isPlayable = true;
      clearInterval(playableCheckerID);
    }
  }, 500);

  playerStore.audio.onloadstart = () => {
    setPlayerStore("playbackState", "paused");
    setPlayerStore("status", "");
    if (isPlayable) playerStore.audio.play();

    historyID = playerStore.stream.id;
    playCountedForTrackId = "";
    clearTimeout(historyTimeoutId);
    playerStore.audio.playbackRate = playerStore.playbackRate;
  };

  playerStore.audio.onwaiting = () => {
    setPlayerStore("playbackState", "loading");
  };

  playerStore.audio.ontimeupdate = () => {
    if (
      typeof document !== "undefined" &&
      document.activeElement?.matches('input[type="range"]')
    )
      return;

    const { audio, lrcSync, fullDuration, isMusic } = playerStore;

    // Lyrics
    if (lrcSync) lrcSync(audio.currentTime);

    const seconds = Math.floor(audio.currentTime);

    setPlayerStore("currentTime", seconds);
    checkSponsorBlock(audio.currentTime);

    // Artwork background pans with the progress, motion backgrounds only.
    if (isMusic && playerBackground().endsWith("-motion") && fullDuration > 0) {
      const { ref } = navStore.player;
      if (ref) {
        const diff = ref.offsetHeight - ref.offsetWidth;
        const shift = Math.floor((seconds / fullDuration) * diff);
        cssVar("--player-bp", `-${shift}px 0`);
      }
    }

    const t = params.get("t");

    if (t) {
      if (isMusic) {
        updateParam("t");
        if (playerStore.saveProgress) {
          setPlayerStore("saveProgress", false);
          updateParam("s");
        }
      } else {
        if (seconds % 5 === 0) {
          const str = seconds.toString();
          if (t !== str) updateParam("t", str);
        }
      }
    }
  };

  playerStore.audio.onloadedmetadata = () => {
    setPlayerStore({
      currentTime: 0,
      fullDuration: Math.floor(playerStore.audio.duration || 0),
    });

    if (typeof navigator !== "undefined" && "mediaSession" in navigator)
      import("@modules/mediaSession").then((m) =>
        m.updateMediaSessionPosition(),
      );
  };

  playerStore.audio.onerror = () =>
    import("@modules/audioErrorHandler").then((mod) =>
      mod.default(playerStore.audio),
    );
});

async function getRecommendations() {
  const currentTitle = playerStore.stream.title;
  const title = encodeURIComponent(currentTitle);
  const artist = encodeURIComponent(
    playerStore.stream.author?.slice(0, -8) ?? "",
  );
  fetch(`${store.api}/similar?title=${title}&artist=${artist}&limit=10`)
    .then((res) => res.json())
    .then((data) =>
      addToQueue(
        data.map((item: TrackItem) => ({
          ...item,
          context: { src: "queue", id: `Similar to ${currentTitle}` },
        })),
      ),
    )
    .catch((e) =>
      setStore(
        "snackbar",
        `Could not get recommendations for the track: ${e.message}`,
      ),
    );
}

export const [queueStore, setQueueStore] = createStore({
  list: [] as TrackItem[],
  history: [] as TrackItem[],
  removeMode: false,
  isLoading: false,
});

/**
 * Filter items based on configuration and state.
 * By default blocks duplicates in queue/history and respects duration.
 * Items with context.src === '' bypass these filters (manual user intent).
 */
function filterItemsByConfig(
  items: TrackItem[],
  options: {
    ignoreList?: TrackItem[];
  } = {},
): TrackItem[] {
  const historyIds = new Set(queueStore.history.map((i) => i.id));
  const queueIds = new Set(queueStore.list.map((i) => i.id));
  const ignoreIds = new Set(options.ignoreList?.map((i) => i.id) || []);
  const currentId = playerStore.stream.id;
  const durationLimit = config.durationFilter
    ? parseDuration(config.durationFilter)
    : Infinity;

  return items.filter((item) => {
    if (!item.id) return false;

    // Manual intent override: if src is exactly '', we allow it regardless of filters.
    if (item.context?.src === "") return true;

    return (
      item.id !== currentId &&
      !queueIds.has(item.id) &&
      !historyIds.has(item.id) &&
      !ignoreIds.has(item.id) &&
      parseDuration(item.duration) < durationLimit
    );
  });
}

/**
 * Main entry point for adding items to the queue.
 */
export function addToQueue(
  items: TrackItem[],
  options: {
    replace?: boolean;
    prepend?: boolean;
  } = {},
) {
  // Items with context.src === '' bypass all config filters
  let itemsToAdd = filterItemsByConfig(items);

  setQueueStore("list", (prevList) => {
    let combined = options.replace
      ? itemsToAdd
      : options.prepend
        ? [...itemsToAdd, ...prevList]
        : [...prevList, ...itemsToAdd];
    if (combined.length > 1) {
      if (config.persistentShuffle) combined = shuffle(combined);
      if (config.authorGrouping) combined = groupQueueByAuthor(combined);
    }
    return combined;
  });
}

export function groupQueueByAuthor(list: TrackItem[]): TrackItem[] {
  if (list.length <= 1) return [...list];
  const result: TrackItem[] = [];
  const remaining = [...list];

  while (remaining.length > 0) {
    const current = remaining.shift()!;
    result.push(current);
    const currentNorm = normalizeAuthorKey(current.author);
    if (currentNorm) {
      for (let i = 0; i < remaining.length; i++) {
        if (normalizeAuthorKey(remaining[i].author) === currentNorm) {
          result.push(remaining.splice(i, 1)[0]);
          i--;
        }
      }
    }
  }
  return result;
}

export function totalQueueDuration(list: TrackItem[]): string {
  if (list.length === 0) return "";
  const totalSeconds = list.reduce(
    (acc, item) => acc + parseDuration(item.duration),
    0,
  );
  return convertSStoHHMMSS(totalSeconds);
}

const createSearchInitialState = () => ({
  query: "",
  results: [] as (YTItem | YTListItem)[],
  isLoading: false,
  page: 1,
  suggestions: {
    data: [] as string[],
    index: -1,
    controller: new AbortController(),
  },
  observer: { disconnect() {} } as IntersectionObserver,
});

export const [searchStore, setSearchStore] = createStore(
  createSearchInitialState(),
);

let suggestionTimeout: ReturnType<typeof setTimeout> | undefined;
let lastQuery = "";
const DEBOUNCE_TIME = 400;

function cancelPendingSuggestions() {
  clearTimeout(suggestionTimeout);
  searchStore.suggestions.controller.abort();
}

/**
 * Drops the dropdown for good. Aborting alone is not enough: the debounced fetch
 * may not have started yet, so a pending timer would repopulate the list after a
 * search has already been submitted.
 */
export function clearSuggestions() {
  cancelPendingSuggestions();
  lastQuery = "";
  setSearchStore("suggestions", { data: [], index: -1 });
}

export function getSearchSuggestions(text: string) {
  cancelPendingSuggestions();

  if (text.length < 3) {
    setSearchStore("suggestions", "data", []);
    lastQuery = "";
    return;
  }

  if (text === lastQuery) return;

  suggestionTimeout = setTimeout(() => {
    lastQuery = text;
    setSearchStore("page", 1);
    setSearchStore("suggestions", "index", -1);

    const newController = new AbortController();
    setSearchStore("suggestions", "controller", newController);

    const isMusic = ["song", "artist", "album"].includes(config.searchFilter);
    const url = `/search-suggestions?q=${encodeURIComponent(text)}&music=${isMusic}`;

    fetch(url, { signal: newController.signal })
      .then((res) => res.json() as Promise<string[]>)
      .then((data) => {
        // A resolved-but-aborted response can still land here, so confirm this
        // is still the active request before repopulating the dropdown.
        if (searchStore.suggestions.controller !== newController) return;
        setSearchStore("suggestions", "data", data);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setStore("snackbar", e.message);
        setSearchStore("suggestions", "data", []);
      });
  }, DEBOUNCE_TIME);
}

export async function getSearchResults(force = false) {
  const { query, results, isLoading } = searchStore;
  const { searchFilter } = config;

  if (!query || (isLoading && !force)) return;
  if (!force && results.length > 0) return;

  setSearchStore("isLoading", true);
  clearSuggestions();
  searchStore.observer.disconnect();

  const { recentSearches } = drawer;
  const lc = query.trim().toLowerCase();

  if (
    config.saveRecentSearches &&
    lc &&
    !lc.includes(" ") &&
    !lc.includes(",")
  ) {
    if (recentSearches.includes(lc)) {
      recentSearches.splice(recentSearches.indexOf(lc), 1);
    }
    recentSearches.push(lc);

    while (recentSearches.length > 7) recentSearches.shift();

    setDrawer("recentSearches", recentSearches);
  }

  const url = `${store.api}/search?q=${encodeURIComponent(query)}&f=${searchFilter}`;

  fetch(url)
    .then((res) => res.json() as Promise<(YTItem | YTListItem)[]>)
    .then((data) => {
      setSearchStore("results", data);
    })
    .catch((e) => {
      setStore("snackbar", e.message);
      setSearchStore("results", []);
    })
    .finally(() => {
      setSearchStore("isLoading", false);
    });

  updateParam("q", query);
  updateParam("f", searchFilter === "all" ? "" : searchFilter);
}

const createListInitialState = () => ({
  isLoading: false,
  isSubscribed: false,
  isSortable: false,
  isReversed: false,
  isShared: false,
  showStreamsNumber: false,
  list: [] as YTItem[],
  length: 0,
  reservedCollections: [
    "history",
    "favorites",
    "liked",
    "listenLater",
    "channels",
    "playlists",
    "cached",
    "discovery",
  ],
  name: "",
  url: "",
  type: "collection" as "channels" | "playlists" | "collection" | "album",
  id: "",
  page: 1,
  author: "",
  img: "",
  hasContinuation: false,
  artistAlbums: [] as YTAlbumItem[],
  artistEps: [] as YTAlbumItem[],
  observer: { disconnect() {} } as IntersectionObserver,
});

export const [listStore, setListStore] = createStore(createListInitialState());
export async function getList(
  id: string,
  type: "playlist" | "channel" | "album" | "artist",
  all?: boolean,
) {
  setListStore("hasContinuation", false);

  setListStore("isLoading", true);
  openSubView("list");
  navStore.list.ref?.scrollIntoView({ behavior: "smooth" });

  if (!all) updateParam(type, id);

  // Special case for saved albums
  if (!all && type === "playlist" && id.startsWith("OLAK5uy")) {
    const libraryAlbums = getLibraryAlbums();
    const savedAlbum = libraryAlbums.find((a) => a.id === id);
    if (savedAlbum) {
      setListStore({
        img: savedAlbum.img,
        id: id,
        url: id,
        type: "playlists",
        name: savedAlbum.name,
        author: savedAlbum.author,
        list: [],
      });
      // Continue to fetch from API to get fresh tracks
    }
  }

  try {
    const res = await fetch(
      `${store.api}/${type}?id=${id}${all ? "&all=true" : ""}`,
    );
    if (!res.ok) throw new Error(`Failed to fetch ${type}`);
    const data = (await res.json()) as YTListItem;

    if (data.type === "artist") {
      const artist = data as YTArtistItem;
      const contextId = "Artist - " + artist.name;
      setListStore({
        name: contextId,
        id: id,
        type: "channels",
        url: id,
        img: artist.img,
        list: (artist.items || []).map(
          (v) =>
            ({
              ...v,
              author: withTopicSuffix(v.author),
              context: { src: "channels" as const, id: contextId },
            }) as YTItem,
        ),
        artistAlbums: artist.albums || [],
        artistEps: artist.eps || [],
      });
    } else {
      const listData = data as YTPlaylistItem | YTChannelItem | YTAlbumItem;
      const isChannel = data.type === "channel";
      const listType = isChannel
        ? "channels"
        : data.type === "album"
          ? "album"
          : "playlists";

      const playlistImg = pickImage(
        listData.img,
        listStore.img,
        listData.items?.[0]?.id,
      );

      setListStore({
        name: listData.name,
        img:
          listType === "playlists"
            ? playlistImg
            : listData.img || listStore.img,
        id: id,
        author:
          "author" in listData
            ? (listData as YTPlaylistItem | YTAlbumItem).author || ""
            : listData.name,
        type: listType,
        url: id,
        hasContinuation:
          "hasContinuation" in listData
            ? (listData as YTPlaylistItem).hasContinuation
            : false,
        artistAlbums: [],
        artistEps: [],
        list: (listData.items || []).map(
          (v) =>
            ({
              ...v,
              author:
                data.type === "album" && !isTopicAuthor(v.author)
                  ? withTopicSuffix(v.author)
                  : v.author,
              context: { src: listType as Context, id: listData.name },
            }) as YTItem,
        ),
      });
    }
  } catch (e) {
    setStore("snackbar", e instanceof Error ? e.message : "Unknown error");
    resetList();
  }

  setListStore("isLoading", false);
}

export function resetList() {
  if (navStore.active === "list") {
    openSubView("search");
  }
  listStore.observer.disconnect();

  updateParam("collection");
  updateParam("playlist");
  updateParam("channel");
  updateParam("artist");
  updateParam("album");
  setListStore(createListInitialState());
}

export function loadAll() {
  const { id, type } = listStore;
  if (type === "playlists") {
    getList(id, "playlist", true);
  }
}
