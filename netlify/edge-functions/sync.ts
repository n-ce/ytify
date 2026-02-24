import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

// --- Type Definitions (Mirrored from global.d.ts) ---

interface TrackItem {
  id: string;
  title: string;
  duration: string;
  author: string;
  authorId: string;
  modified?: number;
}

type Collection = { [index: string]: TrackItem };

interface Meta {
  version: number;
  tracks: number;
  [index: string]: number;
}

type CollectionData = string[] | any[]; // Explicitly typed in client, relaxed for generic merge here

interface LibrarySnapshot {
  meta: Meta;
  tracks: Collection;
  [key: string]: Collection | Meta | CollectionData | number | string | undefined;
}

interface DeltaPayload {
  meta: Partial<Meta>;
  addedOrUpdatedTracks: Collection;
  deletedTrackIds: string[];
  updatedCollections: { [collectionName: string]: CollectionData };
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
      const meta = snapshot.meta || { version: 5, tracks: 0 };

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

  // --- POST: Smart Pull (Delta Sync) ---
  if (req.method === "POST") {
    try {
      const { meta: clientMeta } = await req.json() as { meta: Meta };
      const libraryBlob = await libraryStore.getWithMetadata(userIdHash, { type: "json" });

      if (!libraryBlob || !libraryBlob.data) {
        console.warn(`POST /sync: Library not found for user ${userIdHash}`);
        return new Response("No library found.", { status: 404 });
      }

      console.log(`POST /sync: Comparing metadata for user ${userIdHash}`);
      const snapshot = libraryBlob.data as LibrarySnapshot;
      const serverMeta = snapshot.meta || { version: 5, tracks: 0 };
      
      const delta: DeltaPayload = {
        meta: {}, // Start with empty meta for surgical delta
        addedOrUpdatedTracks: {},
        deletedTrackIds: [],
        updatedCollections: {},
        deletedCollectionNames: []
      };

      let hasChanges = false;
      let isFullTrackSync = false;

      // Only include version if it's newer on server
      if ((serverMeta.version || 5) > (clientMeta.version || 5)) {
        delta.meta.version = serverMeta.version;
        hasChanges = true;
      }

      if ((serverMeta.tracks || 0) > (clientMeta.tracks || 0)) {
         const serverTracks = snapshot.tracks || {};
         const clientTracksTimestamp = clientMeta.tracks || 0;
         
         if (clientTracksTimestamp === 0) {
            delta.addedOrUpdatedTracks = serverTracks;
            isFullTrackSync = true;
         } else {
            const deltaTracks: Collection = {};
            for (const id in serverTracks) {
              if ((serverTracks[id].modified || 0) > clientTracksTimestamp) {
                deltaTracks[id] = serverTracks[id];
              }
            }
            delta.addedOrUpdatedTracks = deltaTracks;
            isFullTrackSync = false;
         }
         delta.meta.tracks = serverMeta.tracks; // Only include if server is ahead
         hasChanges = true;
      }

      for (const key in serverMeta) {
         if (key === 'version' || key === 'tracks') continue;
         if ((serverMeta[key] || 0) > (clientMeta[key] || 0)) {
            delta.updatedCollections[key] = snapshot[key] as CollectionData;
            delta.meta[key] = serverMeta[key]; // Only include if server is ahead
            hasChanges = true;
         }
      }

      return new Response(JSON.stringify({
        serverMeta,
        delta: hasChanges ? delta : null,
        fullSyncRequired: false,
        isFullTrackSync
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ETag: libraryBlob.etag!,
        },
      });

    } catch (e) {
      console.error(`Error during POST /sync for user ${userIdHash}:`, e);
      return new Response("Internal server error.", { status: 500 });
    }
  }

  // --- PUT: Apply delta payload ---
  if (req.method === "PUT") {
    const clientETag = req.headers.get("if-match");
    if (!clientETag) {
      return new Response("Missing If-Match header.", { status: 400 });
    }

    try {
      const libraryBlob = await libraryStore.getWithMetadata(userIdHash, { type: "json" });
      let currentSnapshot = libraryBlob?.data as LibrarySnapshot | null;

      if (!currentSnapshot) {
         console.error(`PUT /sync: Library not found for user ${userIdHash}`);
         return new Response("Library not found.", { status: 404 });
      }

      const delta = await req.json() as DeltaPayload;
      console.log(`PUT /sync: Applying delta for user ${userIdHash}. Tracks: ${Object.keys(delta.addedOrUpdatedTracks || {}).length}, Collections: ${Object.keys(delta.updatedCollections || {}).length}`);
      
      applyDeltaInPlace(currentSnapshot, delta);

      await libraryStore.setJSON(userIdHash, currentSnapshot, { 
        onlyIfMatch: clientETag,
        metadata: { 
          contentType: "application/json",
          lastModified: Date.now().toString()
        }
      });

      console.log(`PUT /sync: Successfully updated library for user ${userIdHash}`);
      return new Response(null, { status: 204 }); 
    } catch (e) {
      if (String(e).includes("Precondition Failed")) {
        console.warn(`PUT /sync: ETag mismatch for user ${userIdHash}`);
        const latestBlob = await libraryStore.getWithMetadata(userIdHash, { type: "json" });
        const latestSnapshot = latestBlob?.data as LibrarySnapshot | undefined;
        const serverMeta = latestSnapshot?.meta || { version: 5, tracks: 0 };

        return new Response(JSON.stringify({ serverMeta }), { 
            status: 412,
            headers: { 
                "Content-Type": "application/json",
                "ETag": latestBlob?.etag || ""
            }
        });
      }
      console.error(`Error during PUT /sync for user ${userIdHash}:`, e);
      return new Response("Internal server error during sync.", { status: 500 });
    }
  }

  return new Response(`Method ${req.method} not allowed.`, { status: 405 });
};

function applyDeltaInPlace(next: LibrarySnapshot, delta: DeltaPayload): void {
  if (!next.meta) next.meta = { version: 5, tracks: 0 };
  
  // Merge metadata (timestamps)
  Object.assign(next.meta, delta.meta);

  // Preserve highest version
  const currentVersion = next.meta.version || 5;
  if (delta.meta.version && delta.meta.version > currentVersion) {
    next.meta.version = delta.meta.version;
  } else {
    next.meta.version = currentVersion;
  }

  // Merge tracks
  if (!next.tracks) next.tracks = {};
  if (delta.addedOrUpdatedTracks) {
    Object.assign(next.tracks, delta.addedOrUpdatedTracks);
  }
  
  // Handle deleted tracks
  if (delta.deletedTrackIds) {
    for (const id of delta.deletedTrackIds) {
      delete next.tracks[id];
    }
  }

  // Merge collections
  if (delta.updatedCollections) {
    for (const [name, collectionData] of Object.entries(delta.updatedCollections)) {
      next[name] = collectionData;
    }
  }

  // Handle deleted collections
  if (delta.deletedCollectionNames) {
    for (const name of delta.deletedCollectionNames) {
      delete next[name];
      if (next.meta) delete next.meta[name];
    }
  }
}

export const config: Config = {
  path: ["/sync/:hash"],
};
