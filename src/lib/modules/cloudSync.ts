import { saveCollection, getTracksMap, saveTracksMap, getMeta, getCollection, getCollectionsKeys } from "@lib/utils/library";
import { setStore } from "@lib/stores";
import { config } from "@lib/utils/config";

// --- Core Cloud Access ---

export async function getRemoteManifest(userId: string): Promise<{ remoteMeta: Meta; ETag: string }> {
  const response = await fetch(`/cs/meta/${userId}`);
  if (response.status === 404) {
    const localMeta = getMeta();
    return { remoteMeta: { version: localMeta.version, tracks: 0 }, ETag: "*" };
  }
  if (!response.ok) throw new Error(`Failed to get cloud sync manifest. Status: ${response.status}`);
  const ETag = response.headers.get('ETag') || '';
  const remoteMeta = await response.json() as Meta;
  return { remoteMeta, ETag };
}

export async function getRemoteTracks(userId: string): Promise<{ remoteTracks: Collection; ETag: string }> {
    const response = await fetch(`/cs/tracks/${userId}`);
    if (!response.ok) {
        throw new Error(`Failed to get remote tracks. Status: ${response.status}`);
    }
    const ETag = response.headers.get('ETag') || '';
    const remoteTracks = await response.json() as Collection;
    return { remoteTracks, ETag };
}

export async function pushTrackChanges(userId: string, addedTrackItems: CollectionItem[], deletedTrackIds: string[], ETag: string): Promise<void> {
  if (addedTrackItems.length === 0 && deletedTrackIds.length === 0) return;

  const response = await fetch(`/cs/tracks/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ added: addedTrackItems, deleted: deletedTrackIds }),
    headers: { 'Content-Type': 'application/json', 'If-Match': ETag }
  });

  if (response.status === 412) {
    throw new Error("412 Precondition Failed. Track data updated elsewhere.");
  }
  if (!response.ok) {
    throw new Error(`Track update failed: ${response.statusText}`);
  }
}

export async function pushBulkTrackChanges(userId: string, addedTrackItems: CollectionItem[], ETag: string): Promise<void> {
    if (addedTrackItems.length === 0) return;

    const response = await fetch(`/cs/tracks/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ added: addedTrackItems, deleted: [] }),
        headers: { 'Content-Type': 'application/json', 'If-Match': ETag }
    });

    if (response.status === 412) {
        throw new Error("412 Precondition Failed. Track data updated elsewhere.");
    }
    if (!response.ok) {
        throw new Error(`Bulk track update failed: ${response.statusText}`);
    }
}

export async function pushImmutableContent(data: Collection | CollectionItem[]): Promise<number> {
  const response = await fetch('/.netlify/functions/syncContent', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });
  if (response.status !== 201) throw new Error(`Immutable content push failed: ${response.statusText}`);
  const result = await response.json() as { timestamp: number };
  return result.timestamp;
}

export async function finalizeSync(userId: string, ETag: string, finalMeta: Meta): Promise<void> {
  if (!finalMeta.tracks) finalMeta.tracks = 0;
  const response = await fetch(`/cs/meta/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': ETag },
    body: JSON.stringify(finalMeta)
  });
  if (response.status === 412) throw new Error("412 Precondition Failed. Another device made changes. Must pull and re-try.");
  if (!response.ok) throw new Error("Failed to finalize manifest push.");
  localStorage.setItem('library_meta', JSON.stringify(finalMeta));
}

// --- Delta Pull Operations ---

export async function pullContentByTimestamp(timestamp: number, name: string): Promise<void> {
  const response = await fetch(`/.netlify/functions/syncContent/${timestamp}`);
  if (!response.ok) throw new Error(`Failed to pull content for timestamp ${timestamp}.`);
  const data = await response.json() as Collection | CollectionItem[];
  if (name === 'tracks') throw new Error("Do not use pullContentByTimestamp for tracks.");
  const idsToSave = Array.isArray(data) ? data.map(item => item.id) : Object.keys(data);
  saveCollection(name, idsToSave);
}

export async function pullTrackMetadata(userId: string, trackIds: string[]): Promise<void> {
  if (trackIds.length === 0) return;
  const response = await fetch(`/cs/tracks/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trackIds)
  });
  if (!response.ok) throw new Error('Failed to pull track metadata by ID.');
  const tracks = await response.json() as CollectionItem[];
  if (tracks.length > 0) {
    const existingTracks = getTracksMap();
    for (const track of tracks) existingTracks[track.id] = track;
    saveTracksMap(existingTracks);
  }
}

// --- Sync Orchestration ---

let syncTimeout: NodeJS.Timeout | null = null;
export function scheduleSync() {
  if (!config.dbsync) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    runSync(config.dbsync!);
    syncTimeout = null;
  }, 2 * 60 * 1000);
}

export const getDirtyTracks = (): { added: string[], deleted: string[] } => {
  const dirty = localStorage.getItem('dbsync_dirty_tracks');
  return dirty ? JSON.parse(dirty) : { added: [], deleted: [] };
};
export const saveDirtyTracks = (dirtyTracks: { added: string[], deleted: string[] }) => localStorage.setItem('dbsync_dirty_tracks', JSON.stringify(dirtyTracks));
export const addDirtyTrack = (id: string) => {
  const d = getDirtyTracks();
  if (!d.added.includes(id)) d.added.push(id);
  d.deleted = d.deleted.filter(delId => delId !== id);
  saveDirtyTracks(d);
};
export const removeDirtyTrack = (id: string) => {
  const d = getDirtyTracks();
  if (!d.deleted.includes(id)) d.deleted.push(id);
  d.added = d.added.filter(addId => addId !== id);
  saveDirtyTracks(d);
};
export const clearDirtyTracks = () => localStorage.removeItem('dbsync_dirty_tracks');

export function runSync(userId: string): Promise<{ success: boolean; message: string }> {
  setStore('syncState', 'syncing');

  // Promise.all to fetch manifest and track data concurrently
  return Promise.all([getRemoteManifest(userId), getRemoteTracks(userId)])
    .then(([{ remoteMeta, ETag: manifestETag }, { remoteTracks, ETag: tracksETag }]) => {
      const localMeta = getMeta();
      const finalMeta = { ...localMeta };
      const pullPromises: Promise<void>[] = [];

      // 1. Pull Collections
      for (const key in remoteMeta) {
        if (key === 'version' || key === 'tracks') continue;
        const remoteTimestamp = remoteMeta[key] || 0;
        const localTimestamp = localMeta[key] || 0;
        if (remoteTimestamp > localTimestamp) {
          console.log(`Pulling ${key}: remote is newer.`);
          pullPromises.push(pullContentByTimestamp(remoteTimestamp, key));
          finalMeta[key] = remoteTimestamp;
        }
      }

      // 2. Handle Tracks
      const localTracksTimestamp = localMeta.tracks || 0;
      const remoteTracksTimestamp = remoteMeta.tracks || 0;
      if (remoteTracksTimestamp > localTracksTimestamp) {
        console.log("Pulling track changes: remote is newer.");
        saveTracksMap(remoteTracks); // Overwrite local tracks with server's version
        finalMeta.tracks = remoteTracksTimestamp;
      }
      
      return Promise.all(pullPromises).then(() => ({ finalMeta, manifestETag, tracksETag, remoteMeta, localMeta }));
    })
    .then(({ finalMeta, manifestETag, tracksETag, remoteMeta, localMeta }) => {
      const pushPromises: Promise<any>[] = [];

      // 3. Push Collections
      for (const key of getCollectionsKeys()) {
        const localTimestamp = localMeta[key] || 0;
        const remoteTimestamp = remoteMeta[key] || 0;
        if (localTimestamp > remoteTimestamp) {
          console.log(`Pushing ${key}: local is newer.`);
          const collectionIds = getCollection(key);
          const tracksMap = getTracksMap();
          const collectionItems = collectionIds.map(id => tracksMap[id]).filter(Boolean);
          pushPromises.push(
            pushImmutableContent(collectionItems).then(newTimestamp => {
              finalMeta[key] = newTimestamp;
            })
          );
        }
      }

      // 4. Push Tracks (if dirty)
      const dirtyTracks = getDirtyTracks();
      const localTracks = getTracksMap();
      if (dirtyTracks.added.length > 0 || dirtyTracks.deleted.length > 0) {
        console.log("Pushing dirty track changes.");
        const addedTrackItems = dirtyTracks.added.map(id => localTracks[id]).filter(Boolean);
        pushPromises.push(
          pushTrackChanges(userId, addedTrackItems, dirtyTracks.deleted, tracksETag).then(() => {
            clearDirtyTracks();
            finalMeta.tracks = Date.now();
          })
        );
      } else if ((localMeta.tracks || 0) > (remoteMeta.tracks || 0)) {
        console.log("Local tracks timestamp is newer, but no dirty tracks. Pushing all local tracks.");
        pushPromises.push(
          pushBulkTrackChanges(userId, Object.values(localTracks), tracksETag).then(() => {
            finalMeta.tracks = localMeta.tracks;
          })
        );
      }

      return Promise.all(pushPromises).then(() => ({ finalMeta, manifestETag, remoteMeta }));
    })
    .then(({ finalMeta, manifestETag, remoteMeta }) => {
      // 5. Finalize manifest if changed
      if (JSON.stringify(finalMeta) !== JSON.stringify(remoteMeta)) {
        console.log("Finalizing sync...");
        return finalizeSync(userId, manifestETag, finalMeta);
      }
    })
    .then(() => {
      console.log("Sync complete.");
      setStore('syncState', 'synced');
      return { success: true, message: "Sync complete." };
    })
    .catch(error => {
      console.error("Sync failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("412")) {
        setStore('syncState', 'error');
        return { success: false, message: "Conflict detected. Please try again." };
      }
      setStore('syncState', 'error');
      return { success: false, message: `Sync failed: ${message}` };
    });
}
