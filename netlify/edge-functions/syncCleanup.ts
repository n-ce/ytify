import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/edge-functions";

// Type Definitions
type CollectionItem = {
    id: string,
    title: string,
    author: string,
    duration: string
    authorId: string,
    albumId?: string,
    plays?: number
}

type Collection = { [index: string]: CollectionItem };

// Define constants for the retention policy
const DATA_RETENTION_DAYS = 100;
const INACTIVE_THRESHOLD_MS = DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export default async (): Promise<Response> => {
    // This function runs on a schedule and should not be invoked directly by the client.
    console.log("--- Starting Scheduled Data Cleanup ---");

    // Access the relevant stores
    const metaStore = getStore('meta');
    const trackStore = getStore('tracks');

    // Array to collect track maps from active users for the GC check
    const activeUserTrackMaps: Collection[] = [];

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

                continue; // Skip GC collection for deleted users
            }

            // Collect all track references from the user's collections
            try {
                // Fetch the user's track map for GC reference
                const userTrackMap: Collection = await trackStore.get(userIdHash, { type: 'json' }) || {};
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
        const contentStore = getStore('content');
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

        console.log("Cleanup cycle finished.");

        return new Response(JSON.stringify({
            success: true,
            deletedUsers: deletedUserHashes.length,
            deletedContentBlobs: deletedContentBlobsCount
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        console.error("Fatal error during cleanup:", e);
        return new Response(JSON.stringify({
            error: 'Cleanup failed',
            details: e instanceof Error ? e.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const config: Config = {
    path: "/scheduled/cleanup"
};
