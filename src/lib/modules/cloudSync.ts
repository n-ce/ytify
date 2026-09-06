import {
  getTracksMap,
  getMeta,
  metaUpdater,
  rehydrateStores,
  config,
} from "@utils";
import { setStore, t } from "@stores";

// --- Type Definitions ---

type CollectionData = string[] | Channel[] | Playlist[] | Album[];
type SyncItem = { id: string };

interface LibrarySnapshot {
  meta: Meta;
  tracks: Collection;
  deletedCollections?: Record<string, number>;
  deletedTracks?: Record<string, number>;
  [key: string]:
    | Collection
    | Meta
    | CollectionData
    | Record<string, number>
    | number
    | string
    | undefined;
}

interface DeltaPayload {
  meta: Partial<Meta>;
  addedOrUpdatedTracks: Collection;
  deletedTrackIds: string[];
  updatedCollections: Record<string, CollectionData>;
  deletedCollectionNames: string[];
}

// --- List & Track Merging Helpers ---

function mergeItemList<T extends { id: string }>(local: T[], server: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of server) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of local) {
    if (item?.id) {
      const existing = map.get(item.id);
      map.set(item.id, existing ? { ...existing, ...item } : item);
    }
  }
  return Array.from(map.values());
}

function mergeTrackIds(
  local: string[],
  server: string[],
  prepend: boolean,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  if (prepend) {
    for (const id of local) {
      if (id && !seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
    for (const id of server) {
      if (id && !seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
  } else {
    for (const id of server) {
      if (id && !seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
    for (const id of local) {
      if (id && !seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
  }
  return result;
}

// --- Full Sync ---

export async function pullFullLibrary(userId: string): Promise<void> {
  const response = await fetch(`/library/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to pull library: ${response.statusText}`);
  }
  const snapshot = (await response.json()) as LibrarySnapshot;

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("library_")) localStorage.removeItem(key);
  });

  for (const key in snapshot) {
    if (key === "deletedCollections" || key === "deletedTracks") continue;
    const value = snapshot[key];
    if (value !== undefined) {
      const storageKey = key.startsWith("library_") ? key : `library_${key}`;
      localStorage.setItem(storageKey, JSON.stringify(value));
    }
  }
}

export async function pushFullLibrary(userId: string): Promise<void> {
  const snapshot: Partial<LibrarySnapshot> = {};

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("library_")) {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          const snapKey = key.slice(8);
          (snapshot as Record<string, unknown>)[snapKey] = parsed;
        }
      } catch (e) {
        console.warn(`Failed to parse ${key} during sync push`, e);
      }
    }
  });

  const response = await fetch(`/library/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });

  if (!response.ok) {
    throw new Error(`Failed to push library: ${response.statusText}`);
  }
}

// --- Delta Sync ---

let lastSyncTime = 0;

export async function runSync(
  userId: string,
  retryData?: { count: number; serverMeta?: Meta; ETag?: string },
): Promise<{ success: boolean; message: string }> {
  const retryCount = retryData?.count || 0;
  const MAX_RETRIES = 3;
  if (retryCount === 0) setStore("syncState", "syncing");

  try {
    const isInitialSync = localStorage.getItem("dbsync_account") !== userId;
    const initialLocalMeta = isInitialSync
      ? { version: 5, tracks: 0 }
      : getMeta();
    const inFlightDirtyTracks = getDirtyTracks();
    const inFlightDirtyCollections = getDirtyCollections();

    let remoteMeta: Meta;
    let ETag: string;

    if (retryData?.serverMeta && retryData?.ETag) {
      remoteMeta = retryData.serverMeta;
      ETag = retryData.ETag;
    } else {
      const pullResponse = await fetch(`/sync/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta: initialLocalMeta }),
      });

      if (
        [502, 503, 504].includes(pullResponse.status) &&
        retryCount < MAX_RETRIES
      ) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, retryCount)));
        return runSync(userId, { count: retryCount + 1 });
      }

      if (pullResponse.status === 404) {
        await pushFullLibrary(userId);
        localStorage.setItem("dbsync_account", userId);
        localStorage.removeItem("dbsync_dirty_tracks");
        localStorage.removeItem("dbsync_dirty_collections");
        setStore("syncState", "synced");
        lastSyncTime = Date.now();
        return { success: true, message: t("sync_initial_complete") };
      }

      if (!pullResponse.ok) {
        throw new Error(`Failed to initiate sync: ${pullResponse.statusText}`);
      }

      const pullResult = (await pullResponse.json()) as {
        serverMeta: Meta;
        delta: DeltaPayload | null;
        fullSyncRequired: boolean;
        isFullTrackSync: boolean;
      };
      remoteMeta = pullResult.serverMeta;
      ETag = pullResponse.headers.get("ETag") || "";

      if (pullResult.delta) {
        applyDelta(
          pullResult.delta,
          pullResult.isFullTrackSync || isInitialSync,
          isInitialSync,
        );
        rehydrateStores();
      } else if (pullResult.fullSyncRequired) {
        await pullFullLibrary(userId);
        rehydrateStores();
      }
    }

    localStorage.setItem("dbsync_account", userId);

    const currentTracks = getTracksMap();

    const deltaPayload: DeltaPayload = {
      meta: {},
      addedOrUpdatedTracks: {},
      deletedTrackIds: [],
      updatedCollections: {},
      deletedCollectionNames: [],
    };

    // Tracks logic: push dirty tracks OR full library if server is empty but client has tracks
    const hasDirtyTracks =
      inFlightDirtyTracks.added.length > 0 ||
      inFlightDirtyTracks.deleted.length > 0;
    const serverHasNoTracks =
      (remoteMeta.tracks === 0 || !remoteMeta.tracks) &&
      Object.keys(currentTracks).length > 0;

    if (hasDirtyTracks || serverHasNoTracks) {
      if (serverHasNoTracks) {
        Object.assign(deltaPayload.addedOrUpdatedTracks, currentTracks);
      } else {
        inFlightDirtyTracks.added.forEach((id) => {
          if (currentTracks[id])
            deltaPayload.addedOrUpdatedTracks[id] = currentTracks[id];
        });
      }
      deltaPayload.deletedTrackIds = inFlightDirtyTracks.deleted;
      deltaPayload.meta.tracks = initialLocalMeta.tracks || Date.now();
    }

    // Compare initial local meta vs remote meta to decide what to push
    for (const key in initialLocalMeta) {
      if (key === "version" || key === "tracks") continue;
      if ((initialLocalMeta[key] || 0) > (remoteMeta[key] || 0)) {
        const rawData = localStorage.getItem(`library_${key}`);
        if (rawData) {
          deltaPayload.updatedCollections[key] = JSON.parse(
            rawData,
          ) as CollectionData;
          deltaPayload.meta[key] = initialLocalMeta[key];
        }
      }
    }

    // Only send collections that were explicitly deleted locally
    deltaPayload.deletedCollectionNames = [...inFlightDirtyCollections.deleted];

    if (
      Object.keys(deltaPayload.meta).length === 0 &&
      Object.keys(deltaPayload.addedOrUpdatedTracks).length === 0 &&
      deltaPayload.deletedTrackIds.length === 0 &&
      deltaPayload.deletedCollectionNames.length === 0
    ) {
      setStore("syncState", "synced");
      lastSyncTime = Date.now();
      return { success: true, message: t("sync_up_to_date") };
    }

    const putResponse = await fetch(`/sync/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": ETag,
      },
      body: JSON.stringify(deltaPayload),
    });

    if (
      [502, 503, 504].includes(putResponse.status) &&
      retryCount < MAX_RETRIES
    ) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, retryCount)));
      return runSync(userId, { count: retryCount + 1 });
    }

    if (putResponse.status === 412) {
      if (retryCount < MAX_RETRIES) {
        await new Promise((r) =>
          setTimeout(r, 150 * Math.pow(2, retryCount) + Math.random() * 100),
        );
        return runSync(userId, { count: retryCount + 1 });
      }
      throw new Error(t("sync_conflict"));
    }

    if (!putResponse.ok) {
      throw new Error(`Failed to push delta: ${putResponse.statusText}`);
    }

    clearDirtyTracks(inFlightDirtyTracks);
    clearDeletedCollections(inFlightDirtyCollections.deleted);
    setStore("syncState", "synced");
    lastSyncTime = Date.now();

    return { success: true, message: t("sync_changes_synced") };
  } catch (error) {
    console.error("Sync failure:", error);
    const message = error instanceof Error ? error.message : String(error);
    setStore("syncState", "error");
    return { success: false, message: `${t("sync_failed")} ${message}` };
  }
}

function applyDelta(
  delta: DeltaPayload,
  isFullTrackSync?: boolean,
  isInitialSync?: boolean,
) {
  let localTracks = getTracksMap();

  if (isFullTrackSync) {
    const mergedTracks: Collection = { ...delta.addedOrUpdatedTracks };
    const dirty = getDirtyTracks();

    // Preserve any local tracks that were not on the server
    for (const [id, track] of Object.entries(localTracks)) {
      if (!mergedTracks[id]) {
        mergedTracks[id] = track;
        if (!dirty.added.includes(id)) {
          dirty.added.push(id);
        }
      }
    }

    dirty.deleted.forEach((id) => {
      delete mergedTracks[id];
    });

    saveDirtyTracks(dirty);
    localTracks = mergedTracks;
  } else {
    Object.assign(localTracks, delta.addedOrUpdatedTracks);
    delta.deletedTrackIds.forEach((id) => delete localTracks[id]);
  }

  localStorage.setItem("library_tracks", JSON.stringify(localTracks));

  const currentMeta = getMeta();

  // Process updated collections with intelligent merging
  for (const [key, remoteData] of Object.entries(delta.updatedCollections)) {
    const localRaw = localStorage.getItem(`library_${key}`);
    if (!localRaw) {
      localStorage.setItem(`library_${key}`, JSON.stringify(remoteData));
      continue;
    }

    const localTimestamp = currentMeta[key] || 0;
    const serverTimestamp =
      typeof delta.meta[key] === "number" ? delta.meta[key]! : 0;
    const hasLocalState = localTimestamp > 0;

    // Use union merging only for initial sync when no local collection state exists
    if (isInitialSync && !hasLocalState) {
      try {
        const localData = JSON.parse(localRaw);
        if (key === "channels" || key === "playlists" || key === "albums") {
          const merged = mergeItemList(
            Array.isArray(localData) ? localData : [],
            Array.isArray(remoteData) ? (remoteData as SyncItem[]) : [],
          );
          localStorage.setItem(`library_${key}`, JSON.stringify(merged));
        } else if (Array.isArray(remoteData) && Array.isArray(localData)) {
          const isPrepended = ["history", "favorites", "liked"].includes(key);
          const merged = mergeTrackIds(
            localData,
            remoteData as string[],
            isPrepended,
          );
          localStorage.setItem(`library_${key}`, JSON.stringify(merged));
        } else {
          localStorage.setItem(`library_${key}`, JSON.stringify(remoteData));
        }
      } catch {
        localStorage.setItem(`library_${key}`, JSON.stringify(remoteData));
      }
    } else {
      // Last-write-wins: apply newer server snapshot so complete server collections can remove locally stored items
      if (serverTimestamp >= localTimestamp) {
        localStorage.setItem(`library_${key}`, JSON.stringify(remoteData));
      }
    }
  }

  // Handle deleted collections from server
  for (const key of delta.deletedCollectionNames) {
    localStorage.removeItem(`library_${key}`);
  }

  for (const [key, timestamp] of Object.entries(delta.meta)) {
    if (typeof timestamp === "number" && timestamp > (currentMeta[key] || 0)) {
      currentMeta[key] = timestamp;
    }
  }

  for (const key of delta.deletedCollectionNames) {
    delete currentMeta[key];
  }

  localStorage.setItem("library_meta", JSON.stringify(currentMeta));
}

let syncTimeout: NodeJS.Timeout | null = null;

export function scheduleSync() {
  if (!config.dbsync) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    runSync(config.dbsync!);
    syncTimeout = null;
  }, 30 * 1000);
}

// --- Lifecycle Sync Listeners (Focus / Visibility) ---

let lifecycleInitialized = false;

export function initSyncLifecycle() {
  if (
    lifecycleInitialized ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  )
    return;
  lifecycleInitialized = true;

  const onVisibleOrFocused = () => {
    if (document.visibilityState === "visible" && config.dbsync) {
      const now = Date.now();
      if (now - lastSyncTime > 30 * 1000) {
        runSync(config.dbsync);
      }
    }
  };

  document.addEventListener("visibilitychange", onVisibleOrFocused);
  window.addEventListener("focus", onVisibleOrFocused);
}

// --- Dirty Track Tracking ---

export const getDirtyTracks = (): { added: string[]; deleted: string[] } => {
  const dirty = localStorage.getItem("dbsync_dirty_tracks");
  return dirty ? JSON.parse(dirty) : { added: [], deleted: [] };
};

export const saveDirtyTracks = (dirtyTracks: {
  added: string[];
  deleted: string[];
}) => {
  localStorage.setItem("dbsync_dirty_tracks", JSON.stringify(dirtyTracks));
};

export const addDirtyTrack = (id: string) => {
  const dirtyTracks = getDirtyTracks();
  if (!dirtyTracks.added.includes(id)) dirtyTracks.added.push(id);
  dirtyTracks.deleted = dirtyTracks.deleted.filter(
    (deletedId) => deletedId !== id,
  );
  saveDirtyTracks(dirtyTracks);
  metaUpdater("tracks");
  scheduleSync();
};

export const removeDirtyTrack = (id: string) => {
  const dirtyTracks = getDirtyTracks();
  if (!dirtyTracks.deleted.includes(id)) dirtyTracks.deleted.push(id);
  dirtyTracks.added = dirtyTracks.added.filter((addedId) => addedId !== id);
  saveDirtyTracks(dirtyTracks);
  metaUpdater("tracks");
  scheduleSync();
};

export const clearDirtyTracks = (pushed: {
  added: string[];
  deleted: string[];
}) => {
  const current = getDirtyTracks();
  current.added = current.added.filter((id) => !pushed.added.includes(id));
  current.deleted = current.deleted.filter(
    (id) => !pushed.deleted.includes(id),
  );

  if (current.added.length === 0 && current.deleted.length === 0) {
    localStorage.removeItem("dbsync_dirty_tracks");
  } else {
    saveDirtyTracks(current);
  }
};

// --- Dirty Collection Tracking ---

export const getDirtyCollections = (): { deleted: string[] } => {
  const dirty = localStorage.getItem("dbsync_dirty_collections");
  return dirty ? JSON.parse(dirty) : { deleted: [] };
};

export const saveDirtyCollections = (dirtyCollections: {
  deleted: string[];
}) => {
  localStorage.setItem(
    "dbsync_dirty_collections",
    JSON.stringify(dirtyCollections),
  );
};

export const addDeletedCollection = (name: string) => {
  const dirty = getDirtyCollections();
  if (!dirty.deleted.includes(name)) dirty.deleted.push(name);
  saveDirtyCollections(dirty);
  scheduleSync();
};

export const clearDeletedCollections = (pushed: string[]) => {
  const current = getDirtyCollections();
  current.deleted = current.deleted.filter((name) => !pushed.includes(name));

  if (current.deleted.length === 0) {
    localStorage.removeItem("dbsync_dirty_collections");
  } else {
    saveDirtyCollections(current);
  }
};
