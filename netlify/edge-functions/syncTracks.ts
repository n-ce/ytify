// syncTracks.ts

import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

// Type Definitions (copied from src/types.d.ts for serverless function context)
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

export default async (req: Request, context: Context): Promise<Response> => {
  // The user hash is captured by the route parameter 'hash'
  const userIdHash = context.params.hash;

  if (!userIdHash) {
    return new Response("User ID hash not provided.", { status: 400 });
  }

  // Access the dedicated Track Store
  const trackStore = getStore('tracks');

  // --- PUT: Track Batch Push (Client -> Server) ---
  // Action: Client sends an array of updated/new CollectionItems.
  if (req.method === 'PUT') {
    try {
      // Client always sends an array of CollectionItems
      const { added, deleted } = await req.json() as { added: CollectionItem[], deleted: string[] };

      if (!Array.isArray(added) || !Array.isArray(deleted)) {
        return new Response("Request body must be an object with 'added' (array of CollectionItems) and 'deleted' (array of strings) properties.", { status: 400 });
      }

      let masterMap: Collection = await trackStore.get(userIdHash, { type: 'json' }) || {};

      // Merge incoming added tracks into the master map
      for (const track of added) {
        masterMap[track.id] = track;
      }

      // Remove deleted tracks from the master map
      for (const id of deleted) {
        delete masterMap[id];
      }

      await trackStore.setJSON(userIdHash, masterMap);

      // SUCCESS: Track map is updated. The client must now update the 'meta.tracks' timestamp via the CAS endpoint.
      return new Response(null, { status: 204 });

    } catch (e) {
      console.error(`Error during track batch push for user ${userIdHash}:`, e);
      return new Response("Internal server error during track push.", { status: 500 });
    }
  }

  // --- POST: Track Metadata Retrieval (Server -> Client) ---
  // Action: Client sends an array of missing Track IDs to be hydrated from the server.
  else if (req.method === 'POST') {
    try {
      // Client sends an array of string IDs in the body
      const requestedIds = await req.json() as string[];

      if (!Array.isArray(requestedIds)) {
        return new Response("Request body must be an array of track IDs.", { status: 400 });
      }

      // 1. Get the current master map
      let masterMap: Collection = await trackStore.get(userIdHash, { type: 'json' }) || {};

      // 2. Filter and build the response array
      const foundTracks: CollectionItem[] = [];
      for (const id of requestedIds) {
        if (masterMap[id]) {
          foundTracks.push(masterMap[id]);
        }
      }

      // SUCCESS: Return only the track objects that were found.
      return new Response(JSON.stringify(foundTracks), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (e) {
      console.error(`Error during track metadata retrieval for user ${userIdHash}:`, e);
      return new Response("Internal server error during track pull by IDs.", { status: 500 });
    }
  }

  // --- Unsupported Method ---
  return new Response(`Method ${req.method} not allowed.`, { status: 405 });
};

export const config: Config = {
  // Defines the single endpoint: /cs/tracks/<user-hash>
  path: ["/cs/tracks/:hash"],
};
