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

interface LibrarySnapshot {
  meta: Meta;
  tracks: Collection;
  [key: string]: Collection | Meta | CollectionData | string | number | undefined;
}

interface DeltaPayload {
  meta: Partial<Meta>;
  addedOrUpdatedTracks: Collection;
  deletedTrackIds: string[];
  updatedCollections: Record<string, CollectionData>;
  deletedCollectionNames: string[];
}

// --- Full Sync ---

export async function pullFullLibrary(userId: string): Promise<void> {
  const response = await fetch(`/library/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to pull library: ${response.statusText}`);
  }
  const snapshot = await response.json() as LibrarySnapshot;

  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('library_')) localStorage.removeItem(key);
  });

  for (const key in snapshot) {
    const value = snapshot[key];
    if (value !== undefined) {
      const storageKey = key.startsWith('library_') ? key : `library_${key}`;
      localStorage.setItem(storageKey, JSON.stringify(value));
    }
  }
}

export async function pushFullLibrary(userId: string): Promise<void> {
  const snapshot: Partial<LibrarySnapshot> = {};

  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('library_')) {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          // Type hardening: snapshot keys are the suffixes
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

export async function runSync(userId: string, retryData?: { count: number, serverMeta?: Meta, ETag?: string }): Promise<{ success: boolean; message: string }> {
  const retryCount = retryData?.count || 0;
  const MAX_RETRIES = 1;
  if (retryCount === 0) setStore("syncState", "syncing");

  try {
    // Capture initial local state to prevent clobbering during the pull phase
    const initialLocalMeta = getMeta();
    const inFlightDirtyTracks = getDirtyTracks();
    
    let remoteMeta: Meta;
    let ETag: string;

    if (retryData?.serverMeta && retryData?.ETag) {
        remoteMeta = retryData.serverMeta;
        ETag = retryData.ETag;
    } else {
        const pullResponse = await fetch(`/sync/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meta: initialLocalMeta })
        });

        if ([502, 503, 504].includes(pullResponse.status) && retryCount < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 2000));
            return runSync(userId, { count: retryCount + 1 });
        }

        if(pullResponse.status === 404){
          await pushFullLibrary(userId);
          localStorage.removeItem("dbsync_dirty_tracks");
          setStore("syncState", "synced");
          return { success: true, message: t("sync_initial_complete") };
        }

        if (!pullResponse.ok) {
          throw new Error(`Failed to initiate sync: ${pullResponse.statusText}`);
        }

        const pullResult = await pullResponse.json() as { serverMeta: Meta, delta: DeltaPayload | null, fullSyncRequired: boolean, isFullTrackSync: boolean };
        remoteMeta = pullResult.serverMeta;
        ETag = pullResponse.headers.get("ETag") || "";

        if (pullResult.delta) {
            applyDelta(pullResult.delta, pullResult.isFullTrackSync);
            rehydrateStores(); 
        } else if (pullResult.fullSyncRequired) {
            await pullFullLibrary(userId);
            rehydrateStores();
        }
    }

    // Refetch latest data for payload, but use initialLocalMeta for comparison
    const currentTracks = getTracksMap();
    
    const deltaPayload: DeltaPayload = {
      meta: {},
      addedOrUpdatedTracks: {},
      deletedTrackIds: [],
      updatedCollections: {},
      deletedCollectionNames: [],
    };

    // Tracks logic: push dirty tracks OR full library if server is empty but client has tracks
    const hasDirtyTracks = inFlightDirtyTracks.added.length > 0 || inFlightDirtyTracks.deleted.length > 0;
    const serverHasNoTracks = (remoteMeta.tracks === 0 || !remoteMeta.tracks) && Object.keys(currentTracks).length > 0;

    if (hasDirtyTracks || serverHasNoTracks) {
        if (serverHasNoTracks) {
            Object.assign(deltaPayload.addedOrUpdatedTracks, currentTracks);
        } else {
            inFlightDirtyTracks.added.forEach(id => {
                if(currentTracks[id]) deltaPayload.addedOrUpdatedTracks[id] = currentTracks[id];
            });
        }
        deltaPayload.deletedTrackIds = inFlightDirtyTracks.deleted;
        deltaPayload.meta.tracks = initialLocalMeta.tracks || Date.now();
    }
    
    // Compare initial local meta vs remote meta to decide what to push
    for(const key in initialLocalMeta){
        if(key === 'version' || key === 'tracks') continue;
        if((initialLocalMeta[key] || 0) > (remoteMeta[key] || 0)){
            const rawData = localStorage.getItem(`library_${key}`);
            if(rawData) {
              deltaPayload.updatedCollections[key] = JSON.parse(rawData) as CollectionData;
              deltaPayload.meta[key] = initialLocalMeta[key];
            }
        }
    }

    for(const key in remoteMeta){
       if(key === 'version' || key === 'tracks') continue;
       if(!initialLocalMeta[key]){
           deltaPayload.deletedCollectionNames.push(key);
       }
    }

    if (Object.keys(deltaPayload.meta).length === 0 && 
        Object.keys(deltaPayload.addedOrUpdatedTracks).length === 0 && 
        deltaPayload.deletedTrackIds.length === 0 && 
        deltaPayload.deletedCollectionNames.length === 0) {
      setStore("syncState", "synced");
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

    if ([502, 503, 504].includes(putResponse.status) && retryCount < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000));
        return runSync(userId, { count: retryCount + 1 });
    }

    if (putResponse.status === 412) {
      if (retryCount < MAX_RETRIES) {
        return runSync(userId, { count: retryCount + 1 });
      }
      throw new Error(t("sync_conflict"));
    }
    
    if (!putResponse.ok) {
      throw new Error(`Failed to push delta: ${putResponse.statusText}`);
    }

    clearDirtyTracks(inFlightDirtyTracks);
    setStore("syncState", "synced");
    
    return { success: true, message: t("sync_changes_synced") };

  } catch (error) {
    console.error("Sync failure:", error);
    const message = error instanceof Error ? error.message : String(error);
    setStore("syncState", "error");
    return { success: false, message: `${t("sync_failed")} ${message}` };
  }
}

function applyDelta(delta: DeltaPayload, isFullTrackSync?: boolean) {
    let localTracks = getTracksMap();
    
    if (isFullTrackSync) {
        const newTracks = { ...delta.addedOrUpdatedTracks };
        const dirty = getDirtyTracks();
        
        dirty.added.forEach(id => {
            if (localTracks[id]) newTracks[id] = localTracks[id];
        });
        
        dirty.deleted.forEach(id => {
            delete newTracks[id];
        });
        
        localTracks = newTracks;
    } else {
        Object.assign(localTracks, delta.addedOrUpdatedTracks);
        delta.deletedTrackIds.forEach(id => delete localTracks[id]);
    }
    
    localStorage.setItem('library_tracks', JSON.stringify(localTracks));

    for (const [key, data] of Object.entries(delta.updatedCollections)) {
        localStorage.setItem(`library_${key}`, JSON.stringify(data));
    }
    
    for (const key of delta.deletedCollectionNames) {
        localStorage.removeItem(`library_${key}`);
    }

    const currentMeta = getMeta();
    // Only update meta if the incoming delta is actually newer
    for (const [key, timestamp] of Object.entries(delta.meta)) {
      if (typeof timestamp === 'number' && timestamp > (currentMeta[key] || 0)) {
          currentMeta[key] = timestamp;
      }
    }
    
    for (const key of delta.deletedCollectionNames) {
        delete currentMeta[key];
    }
    
    localStorage.setItem('library_meta', JSON.stringify(currentMeta));
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

export const getDirtyTracks = (): { added: string[]; deleted: string[] } => {
  const dirty = localStorage.getItem("dbsync_dirty_tracks");
  return dirty ? JSON.parse(dirty) : { added: [], deleted: [] };
};

export const saveDirtyTracks = (dirtyTracks: { added: string[]; deleted: string[] }) => {
  localStorage.setItem("dbsync_dirty_tracks", JSON.stringify(dirtyTracks));
};

export const addDirtyTrack = (id: string) => {
  const dirtyTracks = getDirtyTracks();
  if (!dirtyTracks.added.includes(id)) dirtyTracks.added.push(id);
  dirtyTracks.deleted = dirtyTracks.deleted.filter((deletedId) => deletedId !== id);
  saveDirtyTracks(dirtyTracks);
  metaUpdater('tracks');
  scheduleSync();
};

export const removeDirtyTrack = (id: string) => {
  const dirtyTracks = getDirtyTracks();
  if (!dirtyTracks.deleted.includes(id)) dirtyTracks.deleted.push(id);
  dirtyTracks.added = dirtyTracks.added.filter((addedId) => addedId !== id);
  saveDirtyTracks(dirtyTracks);
  metaUpdater('tracks');
  scheduleSync();
};

export const clearDirtyTracks = (pushed: { added: string[]; deleted: string[] }) => {
  const current = getDirtyTracks();
  current.added = current.added.filter(id => !pushed.added.includes(id));
  current.deleted = current.deleted.filter(id => !pushed.deleted.includes(id));
  
  if (current.added.length === 0 && current.deleted.length === 0) {
    localStorage.removeItem("dbsync_dirty_tracks");
  } else {
    saveDirtyTracks(current);
  }
};