import { saveCollection, getTracksMap, saveTracksMap, getMeta, getCollection, getCollectionsKeys } from "@lib/utils/library";

// --- Type Definitions (from user prompt, to be replaced by imports if available) ---
interface Meta { version: number, tracks: number, [key: string]: number; }

// --- Core Cloud Access ---

/**
 * MANDATORY READ LOCK: Fetches the Server Index (meta) and ETag.
 * This must be the first step of any sync operation.
 * @param {string} userId - Current user ID.
 * @returns {Promise<{remoteMeta: Meta, ETag: string}>}
 */
export async function getRemoteManifest(userId: string): Promise<{ remoteMeta: Meta, ETag: string }> {
  const response = await fetch(`/cs/meta/${userId}`);

  if (response.status === 404) {
    // No remote library exists, treat it as a fresh sync
    const localMeta = getMeta();
    return { remoteMeta: { version: localMeta.version, tracks: 0 }, ETag: '' };
  }

  if (!response.ok) {
    throw new Error(`Failed to get cloud sync manifest. Status: ${response.status}`);
  }

  const ETag = response.headers.get('ETag') || '';
  const remoteMeta = await response.json() as Meta;

  return { remoteMeta, ETag };
}

/**
 * Pushes a batch of track changes to the unified track endpoint.
 * Always sends an array, even for a single track update.
 * @param {string} userId - Current user ID.
 * @param {CollectionItem[]} tracks - Array of track objects to update/create.
 */
export async function pushTrackChanges(userId: string, tracks: CollectionItem[]): Promise<void> {
  if (tracks.length === 0) return;

  const response = await fetch(`/cs/tracks/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(tracks),
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Track update failed: ${response.statusText}`);
  }
}

/**
 * Pushes the entire collection array/object to the IMMUTABLE store.
 * Returns the new timestamp key.
 * @param {any} data - The full collection array/object to send.
 * @returns {Promise<number>} The new timestamp key for the meta file.
 */
export async function pushImmutableContent(data: any): Promise<number> {
  const response = await fetch('/cs/content', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });

  if (response.status !== 201) {
    throw new Error(`Immutable content push failed: ${response.statusText}`);
  }

  const result = await response.json() as { timestamp: number };
  return result.timestamp;
}


/**
 * Final CAS WRITE: Pushes the new manifest and attempts the integrity lock.
 * This is the last step of any push operation.
 * @param {string} userId - Current user ID.
 * @param {string} ETag - The ETag read in the initial getRemoteManifest check.
 * @param {Meta} finalMeta - The final new manifest with updated timestamps.
 */
export async function finalizeSync(userId: string, ETag: string, finalMeta: Meta): Promise<void> {
  if (!finalMeta.tracks) {
    finalMeta.tracks = 0;
  }
  const response = await fetch(`/cs/meta/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': ETag, // CRITICAL: Compare-and-Swap (CAS)
    },
    body: JSON.stringify(finalMeta)
  });

  if (response.status === 412) {
    throw new Error("412 Precondition Failed. Another device made changes. Must pull and re-try.");
  }
  if (!response.ok) {
    throw new Error("Failed to finalize manifest push.");
  }

  localStorage.setItem('library_meta', JSON.stringify(finalMeta));
}

// --- Delta Pull Operations (Called after integrity check detects older data) ---

/**
 * PULLS a single collection array/object using its timestamp key.
 * @param {number} timestamp - The timestamp key from the remote Meta manifest.
 * @param {string} name - The collection name (for local storage helper).
 */
export async function pullContentByTimestamp(timestamp: number, name: string): Promise<void> {
  const response = await fetch(`/cs/content/${timestamp}`);
  if (!response.ok) throw new Error(`Failed to pull content for timestamp ${timestamp}.`);

  const data = await response.json() as any;

  if (name === 'tracks') {
    throw new Error("Do not use pullContentByTimestamp for tracks.");
  } else {
    saveCollection(name, data);
  }
}

/**
 * PULLS metadata for an array of track IDs from the server's cache.
 * This replaces the server-side delta logic.
 * @param {string} userId - Current user ID.
 * @param {string[]} trackIds - Array of IDs missing from the local cache.
 */
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
    for (const track of tracks) {
      existingTracks[track.id] = track;
    }
    saveTracksMap(existingTracks);
  }
}

/**
 * Main synchronization function.
 * Orchestrates the pull-merge-push flow.
 * @param {string} userId - The user's ID hash.
 */
export async function runSync(userId: string) {
  try {
    // 1. Get remote manifest and ETag
    const { remoteMeta, ETag } = await getRemoteManifest(userId);
    const localMeta = getMeta();

    const finalMeta = { ...localMeta };

    // 2. PULL phase: Identify and pull newer content from remote
    const pullPromises: Promise<void>[] = [];
    for (const key in remoteMeta) {
      if (key === 'version') continue;

      const remoteTimestamp = remoteMeta[key] || 0;
      const localTimestamp = localMeta[key] || 0;

      if (remoteTimestamp > localTimestamp) {
        console.log(`Pulling ${key}: remote is newer.`);
        if (key !== 'tracks') {
          pullPromises.push(pullContentByTimestamp(remoteTimestamp, key));
        }
        finalMeta[key] = remoteTimestamp;
      }
    }
    await Promise.all(pullPromises);

    // 3. PUSH phase: Identify and push newer local content
    const pushPromises: Promise<void>[] = [];
    for (const key of getCollectionsKeys()) {
      const localTimestamp = localMeta[key] || 0;
      const remoteTimestamp = remoteMeta[key] || 0;

      if (localTimestamp > remoteTimestamp) {
        console.log(`Pushing ${key}: local is newer.`);
        const collectionData = getCollection(key);
        pushPromises.push(
          pushImmutableContent(collectionData).then(newTimestamp => {
            finalMeta[key] = newTimestamp;
          })
        );
      }
    }
    await Promise.all(pushPromises);

    // 4. Track synchronization
    const localTracksTimestamp = localMeta.tracks || 0;
    const remoteTracksTimestamp = remoteMeta.tracks || 0;
    const localTracks = getTracksMap();

    if (localTracksTimestamp > remoteTracksTimestamp) {
      console.log("Pushing track changes.");
      // This is a simplification. We should only push changed tracks.
      // For now, pushing all local tracks.
      await pushTrackChanges(userId, Object.values(localTracks));
      // We need a new timestamp for tracks. The backend doesn't provide one for track pushes.
      // The client is responsible for updating the timestamp.
      finalMeta.tracks = localTracksTimestamp;
    } else if (remoteTracksTimestamp > localTracksTimestamp) {
      console.log("Pulling track changes.");
      // We need to find out which tracks are missing.
      const allTrackIds = new Set<string>();
      for (const key of getCollectionsKeys()) {
        getCollection(key).forEach(id => allTrackIds.add(id));
      }

      const missingTrackIds = [...allTrackIds].filter(id => !localTracks[id]);
      if (missingTrackIds.length > 0) {
        await pullTrackMetadata(userId, missingTrackIds);
      }
      finalMeta.tracks = remoteTracksTimestamp;
    }

    // 5. Finalize sync
    console.log("Finalizing sync...");
    await finalizeSync(userId, ETag, finalMeta);

    console.log("Sync complete.");
    return { success: true, message: "Sync complete." };

  } catch (error) {
    console.error("Sync failed:", error);
    let message;
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }

    if (message.includes("412")) {
      // Retry logic can be implemented here
      return { success: false, message: "Conflict detected. Please try again." };
    }
    return { success: false, message: `Sync failed: ${message}` };
  }
}
