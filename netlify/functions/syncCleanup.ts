import { getStore } from "@netlify/blobs";
import type { Config, Handler } from "@netlify/functions";

// Define constants for the retention policy
const DATA_RETENTION_DAYS = 100;
const INACTIVE_THRESHOLD_MS = DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const handler: Handler = async () => {
  console.log("--- Starting Scheduled Data Cleanup ---");
  const now = Date.now();

  // 1. CLEANUP USER LIBRARIES
  console.log("Cleaning up inactive user libraries...");
  const libraryStore = getStore('library');
  let deletedLibraryCount = 0;

  try {
    const { blobs: libraryBlobs } = await libraryStore.list({ prefix: '' });
    for (const blob of libraryBlobs) {
      const blobWithMeta = await libraryStore.getWithMetadata(blob.key);
      if (!blobWithMeta) continue;

      const lastModifiedTime = (blobWithMeta.metadata?.lastModified as number) || now;
      if ((now - lastModifiedTime) > INACTIVE_THRESHOLD_MS) {
        console.log(`Deleting inactive library: ${blob.key}`);
        await libraryStore.delete(blob.key);
        deletedLibraryCount++;
      }
    }
  } catch (e) {
    console.error("Error cleaning library store:", e);
  }

  // 2. CLEANUP STATIC CONTENT (Shared Collections)
  console.log("Cleaning up old static content...");
  const staticStore = getStore('static');
  let deletedStaticCount = 0;

  try {
    const { blobs: staticBlobs } = await staticStore.list({ prefix: '' });
    for (const blob of staticBlobs) {
      // For static content, the key itself is often the timestamp (e.g., "1715623...").
      // However, we should also check the metadata's lastModified for accuracy.
      const blobWithMeta = await staticStore.getWithMetadata(blob.key);
      if (!blobWithMeta) continue;

      // Use metadata lastModified, fallback to parsing key if it looks like a timestamp
      let lastModifiedTime = blobWithMeta.metadata?.lastModified as number;
      if (!lastModifiedTime && /^\d+$/.test(blob.key)) {
          lastModifiedTime = parseInt(blob.key);
      }
      lastModifiedTime = lastModifiedTime || now;

      if ((now - lastModifiedTime) > INACTIVE_THRESHOLD_MS) {
        console.log(`Deleting old static blob: ${blob.key}`);
        await staticStore.delete(blob.key);
        deletedStaticCount++;
      }
    }
  } catch (e) {
    console.error("Error cleaning static store:", e);
  }

  console.log(`Cleanup complete. Deleted ${deletedLibraryCount} libraries and ${deletedStaticCount} static blobs.`);
  return { statusCode: 200 };
};

export const config: Config = {
  schedule: "0 0 * * *", // Runs daily at midnight UTC
};

export { handler };
