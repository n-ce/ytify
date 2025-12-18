import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

// --- Type Definitions ---

// The entire library snapshot stored in the 'library' blob store.
interface LibrarySnapshot {
  meta: { [key: string]: number };
  tracks: { [trackId: string]: object };
  collections: { [collectionName:string]: string[] };
}

// The payload sent by the client to the PUT endpoint.
// It contains only the data that has changed.
interface DeltaPayload {
  meta: { [key: string]: number };
  addedOrUpdatedTracks: { [trackId: string]: object };
  deletedTrackIds: string[];
  updatedCollections: { [collectionName: string]: string[] };
  deletedCollectionNames: string[];
}

export default async (req: Request, context: Context): Promise<Response> => {
  const userIdHash = context.params.hash;
  if (!userIdHash) {
    return new Response("User ID hash not provided.", { status: 400 });
  }

  const libraryStore = getStore("library");

  // --- GET: Initiates a sync by returning the meta and ETag ---
  if (req.method === "GET") {
    try {
      const libraryBlob = await libraryStore.getWithMetadata(userIdHash, {
        type: "json",
      });

      if (!libraryBlob || !libraryBlob.data) {
        // If the library doesn't exist, we can't start a delta sync.
        // The client should fall back to a full sync via /library/:hash.
        return new Response("No library found. Perform a full sync first.", { status: 404 });
      }

      const snapshot = libraryBlob.data as LibrarySnapshot;
      
      // Return only the meta object and the ETag.
      return new Response(JSON.stringify(snapshot.meta), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ETag: libraryBlob.etag!,
        },
      });
    } catch (e) {
      console.error(`Error during GET /sync for user ${userIdHash}:`, e);
      return new Response("Internal server error.", { status: 500 });
    }
  }

  // --- PUT: Applies the delta payload to the main library snapshot ---
  if (req.method === "PUT") {
    const clientETag = req.headers.get("if-match");
    if (!clientETag) {
      return new Response("Missing If-Match header for Compare-and-Swap.", {
        status: 400,
      });
    }

    try {
      // 1. Fetch the current library state. The ETag check is implicitly handled here.
      // Netlify's get() doesn't directly support CAS, so we do it on the set() operation.
      const currentSnapshot = await libraryStore.get(userIdHash, { type: "json" }) as LibrarySnapshot;

      if (!currentSnapshot) {
         return new Response("Cannot apply delta to a non-existent library.", { status: 404 });
      }

      const delta: DeltaPayload = await req.json();
      const newSnapshot = applyDelta(currentSnapshot, delta);

      // 2. Atomically write the new state back using the ETag.
      await libraryStore.setJSON(userIdHash, newSnapshot, {
        onlyIfMatch: clientETag,
      });

      return new Response(null, { status: 204 }); // Success
    } catch (e) {
      if (String(e).includes("Precondition Failed")) {
        return new Response("Conflict: Library updated by another device. Please re-sync.", { status: 412 });
      }
      console.error(`Error during PUT /sync for user ${userIdHash}:`, e);
      return new Response("Internal server error during sync.", { status: 500 });
    }
  }

  return new Response(`Method ${req.method} not allowed.`, { status: 405 });
};

/**
 * Merges a delta payload into a library snapshot to produce a new snapshot.
 * @param current - The current state of the library.
 * @param delta - The object containing only the changes.
 * @returns The new, merged library state.
 */
function applyDelta(current: LibrarySnapshot, delta: DeltaPayload): LibrarySnapshot {
  // Start with a deep copy of the current state to avoid mutation.
  const next = JSON.parse(JSON.stringify(current));

  // 1. Merge Meta
  Object.assign(next.meta, delta.meta);

  // 2. Merge Tracks
  Object.assign(next.tracks, delta.addedOrUpdatedTracks);
  for (const trackId of delta.deletedTrackIds) {
    delete next.tracks[trackId];
  }

  // 3. Merge Collections
  Object.assign(next.collections, delta.updatedCollections);
  for (const collectionName of delta.deletedCollectionNames) {
    delete next.collections[collectionName];
  }

  return next;
}

export const config: Config = {
  path: ["/sync/:hash"],
};
