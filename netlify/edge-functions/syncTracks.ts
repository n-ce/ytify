// syncTracks.ts

import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

type CollectionItem = {
  id: string,
  title: string,
  author: string,
  duration: string,
  authorId: string,
  albumId?: string,
  plays?: number
}

type Collection = { [index: string]: CollectionItem };

export default async (req: Request, context: Context): Promise<Response> => {
  const userIdHash = context.params.hash;

  if (!userIdHash) {
    return new Response("User ID hash not provided.", { status: 400 });
  }

  const trackStore = getStore('tracks');

  // --- GET: Full Track Library & ETag (Read Lock) ---
  if (req.method === 'GET') {
    try {
      const trackBlob = await trackStore.getWithMetadata(userIdHash, { type: 'json' });
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');

      if (!trackBlob || !trackBlob.data) {
        headers.append('ETag', '*');
        return new Response(JSON.stringify({}), { status: 200, headers });
      }

      headers.append('ETag', trackBlob.etag ?? '');
      return new Response(JSON.stringify(trackBlob.data), { status: 200, headers });
    } catch (e) {
      console.error(`Error reading tracks for user ${userIdHash}:`, e);
      return new Response("Internal server error during track read.", { status: 500 });
    }
  }

  // --- PUT: Track Batch Push with CAS (CAS Write) ---
  else if (req.method === 'PUT') {
    const clientETag = req.headers.get('if-match');

    if (!clientETag) {
      return new Response("Missing If-Match header required for CAS.", { status: 400 });
    }

    try {
      const { added, deleted } = await req.json() as { added: CollectionItem[], deleted: string[] };

      if (!Array.isArray(added) || !Array.isArray(deleted)) {
        return new Response("Request body must be an object with 'added' and 'deleted' properties.", { status: 400 });
      }

      const currentBlob = await trackStore.getWithMetadata(userIdHash, { type: 'json' });

      if (clientETag === '*' && currentBlob && currentBlob.data) {
        return new Response("Precondition Failed. Library already exists.", { status: 412 });
      }

      if (clientETag !== '*' && (!currentBlob || clientETag !== currentBlob.etag)) {
        return new Response("Precondition Failed. Library updated elsewhere.", { status: 412 });
      }
      
      let masterMap: Collection = (currentBlob?.data as Collection) || {};

      for (const track of added) {
        masterMap[track.id] = track;
      }
      for (const id of deleted) {
        delete masterMap[id];
      }

      await trackStore.setJSON(userIdHash, masterMap, { onlyIfMatch: clientETag });

      return new Response(null, { status: 204 });

    } catch (e) {
      const errorString = String(e);
      if (errorString.includes('Precondition Failed')) {
        return new Response("Precondition Failed. Library updated elsewhere.", { status: 412 });
      }
      console.error(`Error during track batch push for user ${userIdHash}:`, e);
      return new Response("Internal server error during track push.", { status: 500 });
    }
  }

  // --- POST: Track Metadata Retrieval by ID ---
  else if (req.method === 'POST') {
    try {
      const requestedIds = await req.json() as string[];
      if (!Array.isArray(requestedIds)) {
        return new Response("Request body must be an array of track IDs.", { status: 400 });
      }

      const masterMap: Collection = await trackStore.get(userIdHash, { type: 'json' }) || {};
      const foundTracks: CollectionItem[] = requestedIds.map(id => masterMap[id]).filter(Boolean);

      return new Response(JSON.stringify(foundTracks), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (e) {
      console.error(`Error during track metadata retrieval for user ${userIdHash}:`, e);
      return new Response("Internal server error during track pull by IDs.", { status: 500 });
    }
  }

  return new Response(`Method ${req.method} not allowed.`, { status: 405 });
};

export const config: Config = {
  path: ["/cs/tracks/:hash"],
};
