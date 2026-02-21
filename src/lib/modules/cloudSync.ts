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
      localStorage.setItem(`library_${key}`, JSON.stringify(value));
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
    const localMeta = getMeta();
    const localTracks = getTracksMap();
    
    let remoteMeta: Meta;
    let ETag: string;

    if (retryData?.serverMeta && retryData?.ETag) {
        remoteMeta = retryData.serverMeta;
        ETag = retryData.ETag;
    } else {
        const pullResponse = await fetch(`/sync/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meta: localMeta })
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

    const inFlightDirtyTracks = getDirtyTracks();
    const currentMeta = getMeta(); 
    
    const deltaPayload: DeltaPayload = {
      meta: {},
      addedOrUpdatedTracks: {},
      deletedTrackIds: [],
      updatedCollections: {},
      deletedCollectionNames: [],
    };

    inFlightDirtyTracks.added.forEach(id => {
      if(localTracks[id]) deltaPayload.addedOrUpdatedTracks[id] = localTracks[id];
    });
    deltaPayload.deletedTrackIds = inFlightDirtyTracks.deleted;
    
    if(inFlightDirtyTracks.added.length > 0 || inFlightDirtyTracks.deleted.length > 0) {
       deltaPayload.meta.tracks = currentMeta.tracks || Date.now();
    }
    
    for(const key in currentMeta){
        if(key === 'version' || key === 'tracks') continue;
        if((currentMeta[key] || 0) > (remoteMeta[key] || 0)){
            const rawData = localStorage.getItem(`library_${key}`);
            if(rawData) {
              deltaPayload.updatedCollections[key] = JSON.parse(rawData) as CollectionData;
              deltaPayload.meta[key] = currentMeta[key];
            }
        }
    }

    for(const key in remoteMeta){
       if(key === 'version' || key === 'tracks') continue;
       if(!currentMeta[key]){
           deltaPayload.deletedCollectionNames.push(key);
       }
    }

    if (Object.keys(deltaPayload.meta).length === 0 && Object.keys(deltaPayload.addedOrUpdatedTracks).length === 0 && deltaPayload.deletedTrackIds.length === 0 && deltaPayload.deletedCollectionNames.length === 0) {
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
        const errorData = await putResponse.json() as { serverMeta: Meta };
        const serverMeta = errorData.serverMeta;
        const newETag = putResponse.headers.get("ETag") || "";
        return runSync(userId, { count: retryCount + 1, serverMeta, ETag: newETag });
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
    Object.assign(currentMeta, delta.meta);
    
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
  }, 2 * 60 * 1000); 
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