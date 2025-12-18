import {
  getTracksMap,
  getMeta,
} from "@lib/utils/library";
import { setStore } from "@lib/stores";
import { config } from "@lib/utils/config";

// --- Type Definitions ---
interface Meta { [key: string]: number }
interface Track { [key: string]: any }
interface LibrarySnapshot {
  [key: string]: any; // Keys are e.g., 'meta', 'tracks', 'favorites' (no prefix)
}

interface DeltaPayload {
  meta: Meta;
  addedOrUpdatedTracks: { [trackId: string]: Track };
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
    // 1. Initiate Sync: Get remote meta and ETag
    const getResponse = await fetch(`/sync/${userId}`);
    
    if(getResponse.status === 404){
      console.log('No remote library found. Performing initial full push.');
      await pushFullLibrary(userId);
      setStore("syncState", "synced");
      return { success: true, message: "Initial library sync complete." };
    }

    if (!getResponse.ok) {
      throw new Error(`Failed to initiate sync: ${getResponse.statusText}`);
    }

    const remoteMeta: Meta = await getResponse.json();
    const ETag = getResponse.headers.get("ETag")!;

    // 2. Prepare Delta Payload
    const localMeta = getMeta();
    const localTracks = getTracksMap();
    
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
    for(const key in localMeta){
        if(key === 'version' || key === 'tracks') continue;
        
        if((localMeta[key] || 0) > (remoteMeta[key] || 0)){
            const rawData = localStorage.getItem(`library_${key}`);
            if(rawData) {
              deltaPayload.updatedCollections[key] = JSON.parse(rawData);
              deltaPayload.meta[key] = localMeta[key];
            }
        }
    }

    // Check for deletions
    for(const key in remoteMeta){
       if(key === 'version' || key === 'tracks') continue;
       if(!localMeta[key]){
           deltaPayload.deletedCollectionNames.push(key);
       }
    }
    
    // -- Pull remote changes --
    let needsFullPull = false;

    if((remoteMeta.tracks || 0) > (localMeta.tracks || 0)) needsFullPull = true;
    
    if (!needsFullPull) {
      for(const key in remoteMeta){
          if(key === 'version' || key === 'tracks') continue;
          if((remoteMeta[key] || 0) > (localMeta[key] || 0)){
              needsFullPull = true;
              break;
          }
      }
    }

    if (needsFullPull) {
       await pullFullLibrary(userId);
       clearDirtyTracks();
       setStore("syncState", "synced");
       return { success: true, message: "Library updated from cloud." };
    }

    // 3. Push Delta
    if (Object.keys(deltaPayload.meta).length === 0) {
      console.log("Sync complete. No changes to push.");
      setStore("syncState", "synced");
      return { success: true, message: "Library is up to date." };
    }
    
    const putResponse = await fetch(`/sync/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": ETag,
      },
      body: JSON.stringify(deltaPayload),
    });

    if (putResponse.status === 412) {
      throw new Error("Conflict: Library updated by another device. Please re-sync.");
    }
    if (!putResponse.ok) {
      throw new Error(`Failed to push delta: ${putResponse.statusText}`);
    }

    // 4. Finalize
    clearDirtyTracks();
    setStore("syncState", "synced");
    return { success: true, message: "Changes synced to cloud." };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Sync failed:", message);
    setStore("syncState", "error");
    return { success: false, message: `Sync failed: ${message}` };
  }
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

export const clearDirtyTracks = () => {
  localStorage.removeItem("dbsync_dirty_tracks");
};