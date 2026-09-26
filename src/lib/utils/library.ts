import {
  setStore,
  t,
  listStore,
  setListStore,
  navStore,
  setNavStore,
  updateParam,
  openSubView,
  resetList,
} from "@stores";
import {
  cachingMode,
  config,
  CACHE_LIMIT_PRESETS,
  drawer,
  parseDuration,
  setCachingModeSignal,
  setCacheLimitSignal,
  setConfig,
  type CachingMode,
} from "@utils";
import {
  cacheTracks,
  clearOpusCache,
  deleteCachedOpus,
  enforceCacheLimit,
  getCachedTrackIdsSync,
} from "@modules/audioCache";

/** The OPFS-backed "Cached" collection. Device-local: it never syncs. */
export const CACHED_COLLECTION = "cached";

/** The algorithmically ranked "Discovery" collection. Virtual: never stored. */
export const DISCOVERY_COLLECTION = "discovery";

/** Collections that are not user-managed localStorage collection lists. */
const PSEUDO_COLLECTIONS = [CACHED_COLLECTION, DISCOVERY_COLLECTION];

/** localStorage `library_` keys that hold something other than a collection list. */
const NON_COLLECTION_KEYS = [
  "channels",
  "playlists",
  "tracks",
  "meta",
  "albums",
  "frequently_played",
];

/**
 * Built-in collections: seeded into localStorage on a fresh install and pinned
 * to the top of the library in this order.
 */
export const RESERVED_ORDER = ["history", "favorites", "liked", "listenLater"];

/** Reserved collections always render with a fixed icon and translated label. */
export const RESERVED_COLLECTIONS: Record<
  string,
  readonly [icon: string, label: TranslationKeys]
> = {
  history: ["ri-memories-fill", "library_history"],
  favorites: ["ri-heart-fill", "library_favorites"],
  listenLater: ["ri-calendar-schedule-fill", "library_listen_later"],
  liked: ["ri-thumb-up-fill", "library_liked"],
  cached: ["ri-thunderstorms-fill", "hub_cached"],
  discovery: ["ri-compass-3-fill", "hub_discovery"],
};

export const syncLibrary = (
  action: "add" | "remove" | "schedule" | "init",
  id?: string,
) => {
  if (config.dbsync)
    import("@modules/cloudSync").then((m) => {
      if (action === "add" && id) m.addDirtyTrack(id);
      else if (action === "remove" && id) m.removeDirtyTrack(id);
      else if (action === "schedule") m.scheduleSync();
      else if (action === "init") m.runSync(config.dbsync!);
    });
};

// New Library V2 utils

export const getMeta = (): Meta => {
  const meta = localStorage.getItem("library_meta");
  if (meta) {
    return JSON.parse(meta);
  }

  const newMeta: Meta = { version: 5, tracks: 0 };

  const collections = getCollectionsKeys();
  for (const key of collections) {
    newMeta[key] = 0;
  }

  if (getLists("channels").length > 0) {
    newMeta.channels = 0;
  }

  if (getLists("playlists").length > 0) {
    newMeta.playlists = 0;
  }

  if (getLibraryAlbums().length > 0) {
    newMeta.albums = 0;
  }

  return newMeta;
};

/**
 * User-managed collection keys, reserved ones first. The `cached` and `discovery`
 * pseudo-collections are deliberately excluded: they render from their own
 * entries rather than from this list.
 */
export const getCollectionsKeys = () => {
  const allKeys = Object.keys(localStorage)
    .filter((key) => key.startsWith("library_"))
    .map((key) => key.slice(8))
    .filter(
      (key) =>
        !NON_COLLECTION_KEYS.includes(key) &&
        !PSEUDO_COLLECTIONS.includes(key),
    );

  const meta = JSON.parse(localStorage.getItem("library_meta") || "{}");

  return [
    ...RESERVED_ORDER.filter((key) => allKeys.includes(key)),
    ...allKeys
      .filter((key) => !RESERVED_ORDER.includes(key))
      .sort((a, b) => (meta[a] || 0) - (meta[b] || 0)),
  ];
};

export const getTracksMap = (): Collection =>
  JSON.parse(localStorage.getItem("library_tracks") || "{}");

export const getCollection = (name: string) =>
  JSON.parse(localStorage.getItem("library_" + name) || "[]") as string[];

export const getLists = <T extends "channels" | "playlists">(
  type: T,
): T extends "channels" ? Channel[] : Playlist[] =>
  JSON.parse(localStorage.getItem("library_" + type) || "[]");

export const getLibraryAlbums = (): LibraryAlbums =>
  JSON.parse(localStorage.getItem("library_albums") || "[]");

export function getCollectionItems(
  collectionId: string,
): (TrackItem & { type?: "video" | "song" })[] {
  if (collectionId === CACHED_COLLECTION) {
    if (cachingMode() === "off") return [];
    const tracks = getTracksMap();
    const cachedIds = getCachedTrackIdsSync();
    return cachedIds
      .filter((id) => tracks[id])
      .map((id) => ({
        ...tracks[id],
        type: "video" as const,
        context: { src: "collection" as const, id: CACHED_COLLECTION },
      }))
      .filter((item) => item.id);
  }

  if (collectionId === DISCOVERY_COLLECTION) {
    return ((drawer.discovery || []) as (YTItem & { frequency: number })[]).map(
      (item) => ({
        ...item,
        type: (item.type || "video") as "video" | "song",
        context: { src: "collection" as const, id: DISCOVERY_COLLECTION },
      }),
    );
  }

  const collectionIds = getCollection(collectionId);
  const tracksMap = getTracksMap();
  return collectionIds
    .map((id: string) => ({
      ...tracksMap[id],
      type: "video" as const,
      context: { src: "collection" as const, id: collectionId },
    }))
    .filter((item) => item.id);
}

/**
 * Track ids held by any collection other than `exclude`, including the
 * OPFS-backed cached collection. Used for reference counting before pruning.
 */
const getReferencedTrackIds = (exclude?: string) => {
  const referenced = new Set<string>();
  for (const key of getCollectionsKeys()) {
    if (key === exclude) continue;
    getCollection(key).forEach((id) => referenced.add(id));
  }
  getCachedTrackIdsSync().forEach((id) => referenced.add(id));
  return referenced;
};

/** Drops library metadata for the given tracks once nothing references them. */
const pruneOrphanTracks = (ids: string[]) => {
  const tracks = getTracksMap();
  const referenced = getReferencedTrackIds();
  let pruned = false;

  for (const id of ids) {
    if (referenced.has(id)) continue;
    if (tracks[id]) {
      delete tracks[id];
      pruned = true;
    }
  }

  if (pruned) saveTracksMap(tracks);
};

export function saveTracksMap(tracks: Collection) {
  localStorage.setItem("library_tracks", JSON.stringify(tracks));
}

export function saveCollection(name: string, collection: string[]) {
  localStorage.setItem("library_" + name, JSON.stringify(collection));
}

export function saveLists<T extends "channels" | "playlists">(
  type: T,
  data: T extends "channels" ? Channel[] : Playlist[],
) {
  localStorage.setItem(`library_${type}`, JSON.stringify(data));
  metaUpdater(type);
  rehydrateStores();
}

export function saveLibraryAlbums(albums: LibraryAlbums) {
  localStorage.setItem("library_albums", JSON.stringify(albums));
}

export function saveAlbumToLibrary(albumId: string, albumData: Album) {
  const albums = getLibraryAlbums();
  if (!albums.find((a) => a.id === albumId)) {
    albums.push(albumData);
    saveLibraryAlbums(albums);
  }
  metaUpdater("albums");
  rehydrateStores();
}

export function removeAlbumFromLibrary(albumId: string) {
  const albums = getLibraryAlbums();
  const newAlbums = albums.filter((a) => a.id !== albumId);
  saveLibraryAlbums(newAlbums);
  metaUpdater("albums");
  rehydrateStores();
}

export function recordTrackPlay(track: TrackItem) {
  if (!track?.id) return;
  const { id } = track;
  const tracks = getTracksMap();

  if (!tracks[id]) {
    tracks[id] = {
      id: track.id,
      title: track.title,
      duration: track.duration,
      author: track.author,
      authorId: track.authorId || "",
      modified: Date.now(),
    };
    saveTracksMap(tracks);
  }

  if (cachingMode() === "auto") syncAudioCache([id]);

  setStore("libraryUpdated", (c) => (c || 0) + 1);
}

/**
 * Writes audio for the given tracks into the OPFS cache, then trims the cache
 * back within the configured limit. With no ids it only enforces the limit.
 */
async function syncAudioCache(ids: string[]) {
  if (cachingMode() === "off") return;

  const evicted = ids.length
    ? await cacheTracks(ids)
    : await enforceCacheLimit();

  if (evicted.length) pruneOrphanTracks(evicted);
  if (listStore.id === CACHED_COLLECTION) rehydrateStores();
}

/**
 * Switches the caching mode. Turning caching off drops the OPFS contents and
 * the cached collection, and the Cached view is closed if it is open.
 */
export function setCachingMode(mode: CachingMode) {
  if (mode === cachingMode()) return;

  setCachingModeSignal(mode);
  setConfig("cachingMode", mode);

  if (mode === "off") {
    const ids = getCollection(CACHED_COLLECTION);
    localStorage.removeItem("library_cached");
    clearOpusCache();
    pruneOrphanTracks(ids);
  } else syncAudioCache([]);

  if (listStore.id === CACHED_COLLECTION) {
    resetList();
    updateParam("collection");
  }

  setStore("libraryUpdated", (c) => (c || 0) + 1);
  if (navStore.active === "library") setNavStore("active", "library");
}

/** Persists a new audio cache ceiling and evicts down to it. */
export function setCacheLimit(megabytes: number) {
  if (!CACHE_LIMIT_PRESETS.includes(megabytes)) return;

  setCacheLimitSignal(megabytes);
  setConfig("cacheLimit", megabytes);
  syncAudioCache([]);
}

export function addToCollection(name: string, data: TrackItem[]) {
  const collection = getCollection(name);
  const tracks = getTracksMap();
  const prepend = ["history", "favorites", "liked"].includes(name);
  const deviceLocal = name === CACHED_COLLECTION;
  const now = Date.now();

  for (const item of data) {
    if (!item?.id) continue;
    const { id } = item;
    const idx = collection.indexOf(id);

    if (idx !== -1) collection.splice(idx, 1);

    if (prepend) collection.unshift(id);
    else collection.push(id);

    if (!tracks[id]) {
      tracks[id] = item;
    }

    tracks[id].modified = tracks[id].modified || now;

    if (!deviceLocal) syncLibrary("add", id);
  }

  saveCollection(name, collection);
  saveTracksMap(tracks);
  metaUpdater(name);

  if (deviceLocal) syncAudioCache(data.map((item) => item?.id).filter(Boolean));

  if (listStore.id === name) rehydrateStores();
}

export function removeFromCollection(name: string, ids: string[]) {
  const collection = getCollection(name);
  const tracks = getTracksMap();
  const deviceLocal = name === CACHED_COLLECTION;
  const removed = ids.filter((id) => collection.includes(id));

  for (const id of removed) {
    const idx = collection.indexOf(id);
    if (idx !== -1) collection.splice(idx, 1);
  }

  saveCollection(name, collection);

  // Counted after the write so the collection no longer vouches for its own ids.
  const references = getReferencedTrackIds(name);

  for (const id of removed) {
    if (references.has(id)) continue;

    delete tracks[id];
    if (!deviceLocal) syncLibrary("remove", id);
  }

  saveTracksMap(tracks);
  metaUpdater(name);

  if (deviceLocal) removed.forEach((id) => deleteCachedOpus(id));

  if (listStore.id === name) rehydrateStores();
}

export function deleteCollection(name: string) {
  const ids = getCollection(name);
  const deviceLocal = name === CACHED_COLLECTION;

  localStorage.removeItem("library_" + name);
  if (deviceLocal) clearOpusCache();

  const references = getReferencedTrackIds(name);
  const tracks = getTracksMap();

  for (const id of ids) {
    if (references.has(id)) continue;

    delete tracks[id];
    if (!deviceLocal) syncLibrary("remove", id);
  }

  saveTracksMap(tracks);

  if (!deviceLocal) {
    if (config.dbsync) {
      import("@modules/cloudSync").then((m) => m.addDeletedCollection(name));
    }
    metaUpdater(name, true);
  }

  rehydrateStores();
}

export const metaUpdater = (key: string, remove?: boolean) => {
  // The cached collection is device-local, so it is neither synced nor tracked.
  if (key === CACHED_COLLECTION) return;

  const meta = getMeta();
  const timestamp = Date.now();

  if (remove) delete meta[key];
  else meta[key] = timestamp;

  localStorage.setItem("library_meta", JSON.stringify(meta));
  setStore("syncState", "dirty");
  syncLibrary("schedule");
};

export function createCollection(title: string) {
  const taken =
    getCollectionsKeys().includes(title) || title in RESERVED_COLLECTIONS;
  if (taken) {
    setStore("snackbar", t("list_already_exists"));
    return;
  }

  saveCollection(title, []);
  metaUpdater(title);
  rehydrateStores();
}

export function renameCollection(oldName: string, newName: string) {
  if (oldName === newName) return;

  const collections = getCollectionsKeys();
  if (collections.includes(newName) || newName in RESERVED_COLLECTIONS) {
    setStore("snackbar", t("list_already_exists"));
    return;
  }

  const collectionItems = getCollection(oldName);
  saveCollection(newName, collectionItems);
  localStorage.removeItem("library_" + oldName);
  metaUpdater(oldName, true);
  metaUpdater(newName);
  rehydrateStores();
}

export function rehydrateStores() {
  if (listStore.type === "collection" && listStore.id) {
    fetchCollection(listStore.id);
  }

  if (navStore.active === "library") {
    setNavStore("active", "library");
  }
}

export async function fetchCollection(
  id: string | null,
  shared: boolean = false,
) {
  if (!id) return;

  if (id === CACHED_COLLECTION && cachingMode() === "off") {
    resetList();
    openSubView("library");
    return;
  }

  openSubView("list");

  setListStore("isLoading", true);

  const display =
    id === CACHED_COLLECTION
      ? t("hub_cached")
      : id === DISCOVERY_COLLECTION
        ? t("hub_discovery")
        : shared
          ? "Shared Collection"
          : id;
  const { reservedCollections } = listStore;
  const isReserved = reservedCollections.includes(id);

  setListStore({
    name: decodeURIComponent(display),
    id: id,
    type: "collection",
    isReversed: isReserved,
    isShared: shared,
  });

  if (shared) {
    await getSharedCollection(id);
    updateParam("si", id);
  } else {
    getLocalCollection(id);
    updateParam("collection", id);
  }

  setListStore("isLoading", false);

  document.title = display + " - ytify";
}

function setObserver(callback: () => number) {
  const ref = document.querySelector(
    `.listContainer > :last-child`,
  ) as HTMLElement;
  if (!ref) return;
  const obs = new IntersectionObserver((entries, observer) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        observer.disconnect();
        const itemsLeft = callback();
        if (itemsLeft) setObserver(callback);
      }
    }),
  );
  obs.observe(ref);
  setListStore("observer", obs);
}

function getLocalCollection(collection: string) {
  const isCached = collection === CACHED_COLLECTION;
  const isDiscovery = collection === DISCOVERY_COLLECTION;

  if (isCached || isDiscovery) {
    const rawItems = getCollectionItems(collection);
    const items: YTItem[] = rawItems.map((item) => ({
      ...item,
      type: (item.type || "video") as "video" | "song",
    }));
    const displayName = isCached ? t("hub_cached") : t("hub_discovery");
    // Both are local and already ordered, so neither is shared nor re-sorted.
    const flags = {
      type: "collection" as const,
      isShared: false,
      isReversed: true,
    };

    if (items.length === 0) {
      setStore("snackbar", "No items found");
      setListStore({
        ...flags,
        list: [],
        length: 0,
        name: displayName,
        id: collection,
      });
      return;
    }

    setListStore({
      ...flags,
      name: displayName,
      id: collection,
      length: items.length,
      list: items,
    });
    return;
  }

  let ids = getCollection(decodeURI(collection));
  if (ids.length === 0) {
    setStore("snackbar", "No items found");
    setListStore({ list: [], length: 0, name: collection });
    return;
  }

  const tracks = getTracksMap();

  let sortedIds = ids;
  const isReserved = listStore.reservedCollections.includes(
    decodeURI(collection),
  );
  if (
    !isReserved &&
    (config.sortBy !== "modified" || config.sortOrder === "asc")
  ) {
    const items = ids.map((id) => tracks[id]);
    const sortedItems = sortCollection(items, config.sortBy, config.sortOrder);
    sortedIds = sortedItems.map((item) => item.id);
  }

  const usePagination = sortedIds.length > 10;

  setListStore({
    name: collection,
    length: sortedIds.length,
  });

  if (usePagination) {
    let loadedCount = 20;
    setListStore(
      "list",
      sortedIds.slice(0, loadedCount).map((id) => ({
        ...tracks[id],
        type: "video" as const,
        context: { src: "collection" as const, id: collection },
      })),
    );

    const observerCallback = () => {
      if (loadedCount >= sortedIds.length) return 0;
      const nextBatch = sortedIds.slice(loadedCount, loadedCount + 20);
      loadedCount += 20;

      setListStore("list", (l) => [
        ...l,
        ...nextBatch.map((id) => ({
          ...tracks[id],
          type: "video" as const,
          context: { src: "collection" as const, id: collection },
        })),
      ]);
      return sortedIds.length - loadedCount;
    };

    setTimeout(() => setObserver(observerCallback), 100);
  } else {
    setListStore(
      "list",
      sortedIds.map((id) => ({
        ...tracks[id],
        type: "video" as const,
        context: { src: "collection" as const, id: collection },
      })),
    );
  }

  setListStore("id", decodeURI(collection));
}

async function getSharedCollection(id: string) {
  setListStore("isLoading", true);
  const data = await fetch(`${location.origin}/ss/${id}`)
    .then((res) => res.json())
    .catch(() => "");

  if (data) {
    if (Array.isArray(data)) {
      setListStore("list", data);
    } else if (typeof data === "object" && data.tracks) {
      setListStore({
        name: data.collection || "Shared Collection",
        list: data.tracks,
      });
    }
  } else setStore("snackbar", `Collection does not exist`);

  setListStore("isLoading", false);
}

export type SortBy = "modified" | "name" | "artist" | "duration";

export function sortCollection(
  list: TrackItem[],
  sortBy: SortBy,
  sortOrder: "asc" | "desc",
): TrackItem[] {
  const listToSort = [...list];

  if (sortBy === "modified") {
    return sortOrder === "asc" ? listToSort.reverse() : listToSort;
  }

  listToSort.sort((a, b) => {
    let result = 0;
    switch (sortBy) {
      case "name":
        result = a.title.localeCompare(b.title);
        break;
      case "artist":
        result = (a.author || "").localeCompare(b.author || "");
        break;
      case "duration":
        result = parseDuration(a.duration) - parseDuration(b.duration);
        break;
    }
    return sortOrder === "asc" ? result : -result;
  });

  return listToSort;
}

export function cleanseLibraryData() {
  // Purge deprecated frequently played data
  localStorage.removeItem("library_frequently_played");
  const storedDrawer = JSON.parse(localStorage.getItem("drawer") || "{}");
  if (storedDrawer.libraryPlays) {
    delete storedDrawer.libraryPlays;
    localStorage.setItem("drawer", JSON.stringify(storedDrawer));
  }

  // 1. Get all tracks from library_tracks
  const rawTracks = JSON.parse(
    localStorage.getItem("library_tracks") || "{}",
  ) as Collection;

  // 2. Identify all valid track IDs by checking all collections and cached tracks
  const collections = getCollectionsKeys();
  const referencedTrackIds = getReferencedTrackIds();

  // 3. Cleanse library_tracks: Only keep tracks that are referenced and strip extra properties
  const cleanedTracks: Collection = {};
  let tracksCleaned = false;

  for (const id in rawTracks) {
    if (id && referencedTrackIds.has(id)) {
      const track = rawTracks[id];
      const cleanedTrack: TrackItem = {
        id: track.id,
        title: track.title,
        duration: track.duration,
        author: track.author,
        authorId: track.authorId || "",
        modified: track.modified || Date.now(),
      };

      cleanedTracks[id] = cleanedTrack;

      if (
        !tracksCleaned &&
        Object.keys(track).length !== Object.keys(cleanedTrack).length
      ) {
        tracksCleaned = true;
      }
    } else {
      tracksCleaned = true;
    }
  }

  if (tracksCleaned) saveTracksMap(cleanedTracks);

  // 4. Cleanse all other collections from empty or missing IDs
  for (const key of [...collections, CACHED_COLLECTION]) {
    const collection = JSON.parse(
      localStorage.getItem("library_" + key) || "[]",
    ) as string[];
    const validCollection = collection.filter((id) => id && rawTracks[id]);
    if (validCollection.length < collection.length) {
      console.log(
        `Found and removed ${collection.length - validCollection.length} invalid entries from '${key}' collection.`,
      );
      saveCollection(key, validCollection);
    }
  }
}
