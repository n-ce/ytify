import {
  getTracksMap,
  getMeta,
} from "@lib/utils/library";
import { setStore, store, t } from "@lib/stores";
import { config } from "@lib/utils/config";

// --- Type Definitions ---
// interface Meta { [key: string]: number } // Meta is global
// interface Track { [key: string]: any } // Removed to use global CollectionItem

interface LibrarySnapshot {
  [key: string]: any; // Keys are e.g., 'meta', 'tracks', 'favorites' (no prefix)
}

interface DeltaPayload {
  meta: Partial<Meta>;
  addedOrUpdatedTracks: Collection;
  deletedTrackIds: string[];
  updatedCollections: { [collectionName: string]: any };
  deletedCollectionNames: string[];
}

// --- Full Sync (Clean Slate) ---

/**
 * Fetches the entire library from the cloud and overwrites the local state.
 */
export async function pullFullLibrary(userId: string): Promise<void> {
  const response = await fetch(`/library/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to pull library: ${response.statusText}`);
  }
  const snapshot: LibrarySnapshot = await response.json();

  // Clear existing library keys before overwrite to ensure a true "clean slate"
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('library_')) localStorage.removeItem(key);
  });

  for (const key in snapshot) {
    localStorage.setItem(`library_${key}`, JSON.stringify(snapshot[key]));
  }
}

/**
 * Gathers the entire local library and pushes it to the cloud, overwriting the remote state.
 */
export async function pushFullLibrary(userId: string): Promise<void> {
  const snapshot: LibrarySnapshot = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('library_')) {
      try {
        const val = localStorage.getItem(key);
        if (val) snapshot[key.slice(8)] = JSON.parse(val);
      } catch (e) {
        console.warn(`Failed to parse ${key} during sync push`, e);
      }
    }
  }

  const response = await fetch(`/library/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });

  if (!response.ok) {
    throw new Error(`Failed to push library: ${response.statusText}`);
  }
}

// --- Delta Sync (The main sync logic) ---

export async function runSync(userId: string): Promise<{ success: boolean; message: string }> {
  setStore("syncState", "syncing");

  try {
    // 1. Initiate Sync: Exchange Meta and Get Diff
    const localMeta = getMeta();
    const localTracks = getTracksMap();
    
    // We send our current meta to the server to ask for a diff
    const pullResponse = await fetch(`/sync/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta: localMeta })
    });

    if(pullResponse.status === 404){
      console.log('No remote library found. Performing initial full push.');
      await pushFullLibrary(userId);
      localStorage.removeItem("dbsync_dirty_tracks");
      if (store.syncState === "syncing") {
        setStore("syncState", "synced");
      }
      return { success: true, message: t("sync_initial_complete") };
    }

    if (!pullResponse.ok) {
      throw new Error(`Failed to initiate sync: ${pullResponse.statusText}`);
    }

    const pullResult = await pullResponse.json();
    const remoteMeta = pullResult.serverMeta as Meta;
    const ETag = pullResponse.headers.get("ETag") || ""; // ETag might be on the blob response, checking headers

    // Apply Server Delta if provided
    if (pullResult.delta) {
        console.log("Applying server delta...");
        applyDelta(pullResult.delta, pullResult.isFullTrackSync);
    } else if (pullResult.fullSyncRequired) {
        console.log("Server requested full sync.");
        await pullFullLibrary(userId);
    }

    // 2. Prepare Delta Payload (Push)
    // We re-read meta in case applying delta changed it (though usually push is based on dirty tracks)
    const currentMeta = getMeta(); 
    
    const deltaPayload: DeltaPayload = {
      meta: {},
      addedOrUpdatedTracks: {},
      deletedTrackIds: [],
      updatedCollections: {},
      deletedCollectionNames: [],
    };

    // -- Compare Tracks (using dirty log) --
    const dirtyTracks = getDirtyTracks();
    dirtyTracks.added.forEach(id => {
      if(localTracks[id]) deltaPayload.addedOrUpdatedTracks[id] = localTracks[id];
    });
    deltaPayload.deletedTrackIds = dirtyTracks.deleted;
    
    if(dirtyTracks.added.length > 0 || dirtyTracks.deleted.length > 0) {
       deltaPayload.meta.tracks = Date.now();
    }
    
    // -- Compare Collections & Lists --
    for(const key in currentMeta){
        if(key === 'version' || key === 'tracks') continue;
        
        // If our local version is newer than what the server *had* (before we pulled), we push.
        // Note: usage of remoteMeta here ensures we don't overwrite if server was already ahead, 
        // but if we just pulled, we are up to date with server. 
        // If we made changes *after* last sync, our timestamp should be higher.
        if((currentMeta[key] || 0) > (remoteMeta[key] || 0)){
            const rawData = localStorage.getItem(`library_${key}`);
            if(rawData) {
              deltaPayload.updatedCollections[key] = JSON.parse(rawData);
              deltaPayload.meta[key] = currentMeta[key];
            }
        }
    }

    // Check for deletions (Push)
    // If we have a key in remoteMeta that we don't have locally, and we didn't just delete it?
    // Actually, if it's in remoteMeta but not localMeta, it might mean we deleted it.
    // OR it might mean the server has something new we don't know about.
    // BUT we just pulled. So if we don't have it now, it means we deleted it.
    for(const key in remoteMeta){
       if(key === 'version' || key === 'tracks') continue;
       if(!currentMeta[key]){
           deltaPayload.deletedCollectionNames.push(key);
       }
    }

    // 3. Push Delta
    if (Object.keys(deltaPayload.meta).length === 0 && Object.keys(deltaPayload.addedOrUpdatedTracks).length === 0 && deltaPayload.deletedTrackIds.length === 0 && deltaPayload.deletedCollectionNames.length === 0) {
      console.log("Sync complete. No changes to push.");
      setStore("syncState", "synced");
      return { success: true, message: t("sync_up_to_date") };
    }
    
    const putResponse = await fetch(`/sync/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": ETag, // Optimistic locking
      },
      body: JSON.stringify(deltaPayload),
    });

    if (putResponse.status === 412) {
      throw new Error(t("sync_conflict"));
    }
    if (!putResponse.ok) {
      throw new Error(`Failed to push delta: ${putResponse.statusText}`);
    }

    // 4. Finalize
    clearDirtyTracks(dirtyTracks);
    if (store.syncState === "syncing") {
      setStore("syncState", "synced");
    }
    return { success: true, message: t("sync_changes_synced") };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Sync failed:", message);
    setStore("syncState", "error");
    return { success: false, message: `${t("sync_failed")} ${message}` };
  }
}

function applyDelta(delta: DeltaPayload, isFullTrackSync?: boolean) {
    let localTracks = getTracksMap();
    
    // 1. Apply Track Changes
    if (isFullTrackSync) {
        // Full Sync Mode: Replace local tracks with server's state, but re-apply local dirty changes
        // This handles deletions from other devices correctly.
        const newTracks = { ...delta.addedOrUpdatedTracks };
        const dirty = getDirtyTracks();
        
        // Re-apply local additions/updates
        dirty.added.forEach(id => {
            if (localTracks[id]) newTracks[id] = localTracks[id];
        });
        
        // Re-apply local deletions
        dirty.deleted.forEach(id => {
            delete newTracks[id];
        });
        
        localTracks = newTracks;
    } else {
        // Delta Mode: Merge updates
        Object.assign(localTracks, delta.addedOrUpdatedTracks);
        delta.deletedTrackIds.forEach(id => delete localTracks[id]);
    }
    
    localStorage.setItem('library_tracks', JSON.stringify(localTracks));

    // 2. Apply Collection Changes
    for (const [key, data] of Object.entries(delta.updatedCollections)) {
        localStorage.setItem(`library_${key}`, JSON.stringify(data));
    }
    
    // 3. Apply Collection Deletions
    for (const key of delta.deletedCollectionNames) {
        localStorage.removeItem(`library_${key}`);
    }

    // 4. Update Meta
    const currentMeta = getMeta();
    Object.assign(currentMeta, delta.meta);
    
    // Explicitly remove deleted collections from meta
    for (const key of delta.deletedCollectionNames) {
        delete currentMeta[key];
    }
    
    localStorage.setItem('library_meta', JSON.stringify(currentMeta));
}

// --- Dirty Track Management ---
let syncTimeout: NodeJS.Timeout | null = null;

export function scheduleSync() {
  if (!config.dbsync) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    runSync(config.dbsync!);
    syncTimeout = null;
  }, 2 * 60 * 1000); // 2 minutes debounce
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
  scheduleSync();
};

export const removeDirtyTrack = (id: string) => {
  const dirtyTracks = getDirtyTracks();
  if (!dirtyTracks.deleted.includes(id)) dirtyTracks.deleted.push(id);
  dirtyTracks.added = dirtyTracks.added.filter((addedId) => addedId !== id);
  saveDirtyTracks(dirtyTracks);
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