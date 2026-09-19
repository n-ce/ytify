import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

// Retention policy for static shared collections
const DATA_RETENTION_DAYS = 100;
const INACTIVE_THRESHOLD_MS = DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export default async () => {
  console.log("--- Starting Scheduled Static Storage Cleanup ---");
  const now = Date.now();

  // CLEANUP STATIC CONTENT (Shared Collections)
  const staticStore = getStore("static");
  let deletedStaticCount = 0;

  try {
    for await (const { blobs: staticBlobs } of staticStore.list({
      paginate: true,
    })) {
      for (const blob of staticBlobs) {
        const blobWithMeta = await staticStore.getWithMetadata(blob.key);
        if (!blobWithMeta) continue;

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

  console.log(`Cleanup complete. Deleted ${deletedStaticCount} static blobs.`);
  return new Response("OK", { status: 200 });
};

export const config: Config = {
  schedule: "0 0 * * *", // Runs daily at midnight UTC
};
