import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

// --- Type Definitions (Mirrored from global.d.ts) ---

interface TrackItem {
  id: string;
  title: string;
  duration: string;
  author: string;
  authorId: string;
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
  meta: Meta;
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
        return new Response("No library found.", { status: 404 });
      }

      const snapshot = libraryBlob.data as LibrarySnapshot;
      const serverMeta = snapshot.meta || { version: 5, tracks: 0 };
      
      const delta: DeltaPayload = {
        meta: serverMeta,
        addedOrUpdatedTracks: {},
        deletedTrackIds: [],
        updatedCollections: {},
        deletedCollectionNames: []
      };

      let hasChanges = false;
      let isFullTrackSync = false;

      if ((serverMeta.tracks || 0) > (clientMeta.tracks || 0)) {
         delta.addedOrUpdatedTracks = snapshot.tracks || {};
         hasChanges = true;
         isFullTrackSync = true;
      }

      for (const key in serverMeta) {
         if (key === 'version' || key === 'tracks') continue;
         if ((serverMeta[key] || 0) > (clientMeta[key] || 0)) {
            delta.updatedCollections[key] = snapshot[key] as CollectionData;
            hasChanges = true;
         }
      }

      for (const key in clientMeta) {
          if (key === 'version' || key === 'tracks') continue;
          if (!serverMeta[key]) {
             delta.deletedCollectionNames.push(key);
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
      let currentSnapshot = await libraryStore.get(userIdHash, { type: "json" }) as LibrarySnapshot | null;

      if (!currentSnapshot) {
         return new Response("Library not found.", { status: 404 });
      }

      const delta = await req.json() as DeltaPayload;
      
      applyDeltaInPlace(currentSnapshot, delta);

      const finalPayload = JSON.stringify(currentSnapshot);
      currentSnapshot = null; 

      await libraryStore.set(userIdHash, finalPayload, { 
        onlyIfMatch: clientETag
      });

      return new Response(null, { status: 204 }); 
    } catch (e) {
      if (String(e).includes("Precondition Failed")) {
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
  const currentVersion = next.meta?.version || 5;
  if (!next.meta) next.meta = { version: 5, tracks: 0 };
  
  Object.assign(next.meta, delta.meta);

  // One-way street for versioning: preserve the highest version
  if (currentVersion > next.meta.version) {
    next.meta.version = currentVersion;
  }

  if (!next.tracks) next.tracks = {};
  Object.assign(next.tracks, delta.addedOrUpdatedTracks);
  
  if (delta.deletedTrackIds) {
    for (const id of delta.deletedTrackIds) {
      delete next.tracks[id];
    }
  }

  if (delta.updatedCollections) {
    for (const [name, collectionData] of Object.entries(delta.updatedCollections)) {
      next[name] = collectionData;
    }
  }

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
