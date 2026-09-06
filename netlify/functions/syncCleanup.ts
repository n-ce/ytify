import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

// Define constants for the retention policy
const DATA_RETENTION_DAYS = 100;
const INACTIVE_THRESHOLD_MS = DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const TOMBSTONE_RETENTION_DAYS = 30;
const TOMBSTONE_THRESHOLD_MS = TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

type LibrarySnapshotCleanup = {
  deletedCollections?: Record<string, number>;
  deletedTracks?: Record<string, number>;
};

export default async () => {
  console.log("--- Starting Scheduled Data Cleanup ---");
  const now = Date.now();

  // 1. CLEANUP USER LIBRARIES & PRUNE OLD TOMBSTONES
  console.log("Cleaning up inactive user libraries...");
  const libraryStore = getStore("library");
  let deletedLibraryCount = 0;

  try {
    for await (const { blobs: libraryBlobs } of libraryStore.list({
      paginate: true,
    })) {
      for (const blob of libraryBlobs) {
        const blobWithMeta = await libraryStore.getWithMetadata(blob.key, {
          type: "json",
        });
        if (!blobWithMeta) continue;

        const lastModifiedStr = blobWithMeta.metadata?.lastModified as
          string | undefined;
        const lastModifiedTime = lastModifiedStr
          ? parseInt(lastModifiedStr)
          : 0;

        // Only delete if we have a valid lastModified AND it's older than threshold
        if (
          lastModifiedTime &&
          now - lastModifiedTime > INACTIVE_THRESHOLD_MS
        ) {
          console.log(`Deleting inactive library: ${blob.key}`);
          await libraryStore.delete(blob.key);
          deletedLibraryCount++;
          continue;
        }

        // Prune old tombstones from active library
        const snapshot = blobWithMeta.data as
          LibrarySnapshotCleanup | null | undefined;
        if (snapshot && typeof snapshot === "object") {
          let modified = false;
          if (snapshot.deletedCollections) {
            for (const [name, time] of Object.entries(
              snapshot.deletedCollections,
            )) {
              if (now - time > TOMBSTONE_THRESHOLD_MS) {
                delete snapshot.deletedCollections[name];
                modified = true;
              }
            }
          }
          if (snapshot.deletedTracks) {
            for (const [id, time] of Object.entries(snapshot.deletedTracks)) {
              if (now - time > TOMBSTONE_THRESHOLD_MS) {
                delete snapshot.deletedTracks[id];
                modified = true;
              }
            }
          }
          if (modified) {
            if (!blobWithMeta.etag) {
              console.warn(
                `Skipping tombstone pruning write for ${blob.key}: missing ETag`,
              );
              continue;
            }
            const writeResult = await libraryStore.setJSON(blob.key, snapshot, {
              metadata: blobWithMeta.metadata || {
                contentType: "application/json",
                lastModified: Date.now().toString(),
              },
              onlyIfMatch: blobWithMeta.etag,
            });
            if (!writeResult.modified) {
              console.log(
                `Concurrent change detected for ${blob.key}; skipping tombstone pruning`,
              );
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Error cleaning library store:", e);
  }

  // 2. CLEANUP STATIC CONTENT (Shared Collections)
  console.log("Cleaning up old static content...");
  const staticStore = getStore("static");
  let deletedStaticCount = 0;

  try {
    for await (const { blobs: staticBlobs } of staticStore.list({
      paginate: true,
    })) {
      for (const blob of staticBlobs) {
        // For static content, the key itself is often the timestamp (e.g., "1715623...").
        // However, we should also check the metadata's lastModified for accuracy.
        const blobWithMeta = await staticStore.getWithMetadata(blob.key);
        if (!blobWithMeta) continue;

        // Use metadata lastModified, fallback to parsing key if it looks like a timestamp
        let lastModifiedTime = parseInt(blob.key) || now;

        if (now - lastModifiedTime > INACTIVE_THRESHOLD_MS) {
          console.log(`Deleting old static blob: ${blob.key}`);
          await staticStore.delete(blob.key);
          deletedStaticCount++;
        }
      }
    }
  } catch (e) {
    console.error("Error cleaning static store:", e);
  }

  console.log(
    `Cleanup complete. Deleted ${deletedLibraryCount} libraries and ${deletedStaticCount} static blobs.`,
  );
  return new Response("OK", { status: 200 });
};

export const config: Config = {
  schedule: "0 0 * * *", // Runs daily at midnight UTC
};
