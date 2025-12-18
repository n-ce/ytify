import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

// --- Type Definitions ---
interface LibrarySnapshot {
  [key: string]: any; // Keys are 'meta', 'tracks', 'favorites' (no prefix)
}
interface Meta { [key: string]: number }
interface Track { [key: string]: any }
interface TrackMap { [id: string]: Track }

interface DeltaPayload {
  meta: Meta;
  addedOrUpdatedTracks: TrackMap;
  deletedTrackIds: string[];
  updatedCollections: { [collectionName: string]: any };
  deletedCollectionNames: string[];
}

export default async (req: Request, context: Context): Promise<Response> => {
  const userIdHash = context.params.hash;
  if (!userIdHash) {
    return new Response("User ID hash not provided.", { status: 400 });
  }

  const libraryStore = getStore("library");

  // --- GET: Return the parsed meta and ETag ---
  if (req.method === "GET") {
    try {
      const libraryBlob = await libraryStore.getWithMetadata(userIdHash, { type: "json" });

      if (!libraryBlob || !libraryBlob.data) {
        return new Response("No library found. Perform a full sync first.", { status: 404 });
      }

      const snapshot = libraryBlob.data as LibrarySnapshot;
      const meta = snapshot["meta"] || { version: 4, tracks: 0 };

      return new Response(JSON.stringify(meta), {
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

  // --- PUT: Apply delta payload ---
  if (req.method === "PUT") {
    const clientETag = req.headers.get("if-match");
    if (!clientETag) {
      return new Response("Missing If-Match header for Compare-and-Swap.", { status: 400 });
    }

    try {
      const currentSnapshot = await libraryStore.get(userIdHash, { type: "json" }) as LibrarySnapshot;

      if (!currentSnapshot) {
         return new Response("Cannot apply delta to a non-existent library.", { status: 404 });
      }

      const delta: DeltaPayload = await req.json();
      const newSnapshot = applyDelta(currentSnapshot, delta);

      await libraryStore.setJSON(userIdHash, newSnapshot, { onlyIfMatch: clientETag });

      return new Response(null, { status: 204 }); 
    } catch (e) {
      if (String(e).includes("Precondition Failed")) {
        return new Response("Conflict: Library updated by another device.", { status: 412 });
      }
      console.error(`Error during PUT /sync for user ${userIdHash}:`, e);
      return new Response("Internal server error during sync.", { status: 500 });
    }
  }

  return new Response(`Method ${req.method} not allowed.`, { status: 405 });
};

function applyDelta(current: LibrarySnapshot, delta: DeltaPayload): LibrarySnapshot {
  const next = { ...current }; 

  // 1. Merge Meta
  if (!next.meta) next.meta = { version: 4, tracks: 0 };
  Object.assign(next.meta, delta.meta);

  // 2. Merge Tracks
  if (!next.tracks) next.tracks = {};
  Object.assign(next.tracks, delta.addedOrUpdatedTracks);
  for (const id of delta.deletedTrackIds) {
    delete next.tracks[id];
  }

  // 3. Merge Collections
  for (const [name, collectionData] of Object.entries(delta.updatedCollections)) {
    next[name] = collectionData;
  }

  // 4. Delete Collections
  for (const name of delta.deletedCollectionNames) {
    delete next[name];
  }

  return next;
}

export const config: Config = {
  path: ["/sync/:hash"],
};
