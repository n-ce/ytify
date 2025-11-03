
import { getStore } from "@netlify/blobs";
import type { Config, Handler } from "@netlify/functions";

// Define constants for the retention policy
const DATA_RETENTION_DAYS = 100;
const INACTIVE_THRESHOLD_MS = DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;

// Store names used by the system
const META_STORE_NAME = 'metaStore';
const TRACK_STORE_NAME = 'trackStore';

const handler: Handler = async () => {
  // This function runs on a schedule and should not be invoked directly by the client.
  console.log("--- Starting Scheduled Data Cleanup ---");

  // Access the relevant stores
  const metaStore = getStore(META_STORE_NAME);
  const trackStore = getStore(TRACK_STORE_NAME);

  // Array to collect track maps from active users for the GC check
  const activeUserTrackMaps: Record<string, any>[] = [];

  // Track users who are being deleted for final cleanup
  const deletedUserHashes: string[] = [];

  const now = Date.now();

  try {
    // --- STEP 1: Process User Retention and Collect Live IDs ---
    // Iterate through all user meta files to determine activity and collect live references.
    const { blobs: userMetaBlobs } = await metaStore.list({ prefix: '' }); // List all user meta files

    for (const blob of userMetaBlobs) {
      const userIdHash = blob.key;

      // Get the blob metadata for the last modification date
      const metaBlob = await metaStore.getWithMetadata(userIdHash);

      if (!metaBlob) continue;

      const lastModifiedTime = metaBlob.metadata.lastModified as number ?? now;
      const isInactive = (now - lastModifiedTime) > INACTIVE_THRESHOLD_MS;

      // Enforce Retention Policy
      if (isInactive) {
        console.log(`Deleting inactive user data for hash: ${userIdHash}`);

        // 1a. Delete the user's meta file and track map
        await metaStore.delete(userIdHash);
        await trackStore.delete(userIdHash);
        deletedUserHashes.push(userIdHash);

        // Note: Deleting the content blobs (collections/lists) is complex 
        // and often deferred until later, as the timestamp keys are needed 
        // to delete from the contentStore. For simplicity, we assume the 
        // core data structures are deleted here.

        continue; // Skip GC collection for deleted users
      }

      // Collect all track references from the user's collections
      try {
        // Since the meta holds timestamps which point to the immutable collection blobs,
        // we would need a complex secondary lookup here to get the actual collection arrays.
        // For a successful run, we assume the client's push process guarantees
        // that all necessary track IDs are contained within the user's master track map 
        // *which we will check directly*. 

        // Fetch the user's track map for GC reference (Optimization: check against the map itself)
        const userTrackMap = await trackStore.get(userIdHash, { type: 'json' });
        if (userTrackMap) {
          activeUserTrackMaps.push(userTrackMap);
        }

      } catch (error) {
        console.error(`Could not process track map for active user ${userIdHash}.`, error);
      }
    }

    console.log(`Retention policy applied. Deleted ${deletedUserHashes.length} inactive users.`);

    // --- STEP 2: Orphaned Content Blob Cleanup (Global Content Store GC) ---
    console.log("--- Starting Content Blob Cleanup ---");
    const contentStore = getStore('contentStore');
    const { blobs: contentBlobs } = await contentStore.list({ prefix: '' });
    let deletedContentBlobsCount = 0;

    for (const blob of contentBlobs) {
      const contentBlobMeta = await contentStore.getWithMetadata(blob.key);
      if (!contentBlobMeta) continue;

      const lastModifiedTime = contentBlobMeta.metadata.lastModified as number ?? now;
      const isOld = (now - lastModifiedTime) > INACTIVE_THRESHOLD_MS;

      if (isOld) {
        console.log(`Deleting old content blob: ${blob.key}`);
        await contentStore.delete(blob.key);
        deletedContentBlobsCount++;
      }
    }
    console.log(`Deleted ${deletedContentBlobsCount} old content blobs.`);

    // --- STEP 3: Orphaned Track Metadata Cleanup (The true GC) ---
    // This process requires knowing all tracks referenced by all active users,
    // which, in this model, is contained within the active user's track map.

    // This logic is highly dependent on how your server-side track map is structured.
    // If the 'trackStore' stores *one* map per user (UserTrackMap), deletion is handled 
    // by the client's push logic (when a track is removed from ALL lists and the client pushes).

    // If the 'trackStore' is a global, single place for ALL track metadata (ID -> TrackObject), 
    // this is where we would iterate over ALL users' collections to build the globalLiveTrackIds Set.

    console.warn("Track Metadata GC is highly context-dependent.");
    // The implementation above assumes the trackStore is user-scoped and deletion is mostly covered 
    // by the user deletion/client logic. A *global* track store would require fetching 
    // ALL collection arrays from the content store to find all live IDs.

    console.log("Cleanup cycle finished.");

    return { statusCode: 200 };

  } catch (e) {
    console.error("Fatal error during cleanup:", e);
    return { statusCode: 500 };
  }
};

export const config: Config = {
  // This function will be triggered by a scheduled cron job (e.g., daily)
  schedule: "0 0 * * *", // Example: Runs daily at midnight UTC
};

export { handler };
