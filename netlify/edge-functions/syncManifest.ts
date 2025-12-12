// syncManifest.ts

import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

// FINAL CORRECTED INTERFACE: Timestamps are numbers, and all keys are strings pointing to numbers.
interface Meta {
  version: number;
  tracks: number;
  [key: string]: number; // Covers history, favorites, channels, etc., keyed by timestamp number
}

export default async (req: Request, context: Context): Promise<Response> => {
  // The user hash is captured by the route parameter 'hash'
  const userIdHash = context.params.hash;

  if (!userIdHash) {
    return new Response("User ID hash not provided.", { status: 400 });
  }

  // Access the dedicated Meta Store
  const metaStore = getStore('meta');

  // --- GET: Integrity Check (Read Lock) ---
  if (req.method === 'GET') {
    try {
      // CRITICAL: The userIdHash is the key to the blob. Get the blob and its metadata (ETag).
      const metaBlob = await metaStore.getWithMetadata(userIdHash, { type: 'json' });

      if (!metaBlob || !metaBlob.data) {
        // Return 404 if the library doesn't exist.
        return new Response("Meta manifest not found.", { status: 404 });
      }

      // SUCCESS: Return the data and expose the ETag via the HTTP header.
      return new Response(JSON.stringify(metaBlob.data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "ETag": metaBlob.etag! // Netlify Blobs guarantees ETag exists on successful get
        }
      });

    } catch (e) {
      console.error(`Error reading meta for user ${userIdHash}:`, e);
      return new Response("Internal server error during meta read.", { status: 500 });
    }
  }

  // --- PUT: Finalize Sync (CAS Write) ---
  else if (req.method === 'PUT') {
    // Read the ETag sent by the client for the CAS check
    const clientETag = req.headers.get('if-match');

    if (!clientETag) {
      return new Response("Missing If-Match header required for CAS.", { status: 400 });
    }

    try {
      const newMetaData = await req.json() as Meta;

      // CRITICAL STEP: Use ifMatch to enforce Compare-and-Swap
      await metaStore.setJSON(userIdHash, newMetaData, {
        // If this ETag does not match the server's current ETag, it fails.
        onlyIfMatch: clientETag
      });

      // SUCCESS: CAS succeeded. The manifest is updated, and the ETag has changed server-side.
      return new Response(null, { status: 204 });

    } catch (e) {
      const errorString = String(e);

      if (errorString.includes('Precondition Failed')) {
        // This is the race condition failure (412)
        return new Response("Precondition Failed. Library updated elsewhere.", { status: 412 });
      }

      console.error(`Error writing meta for user ${userIdHash}:`, e);
      return new Response("Internal server error during meta write.", { status: 500 });
    }
  }

  // --- Unsupported Method ---
  return new Response(`Method ${req.method} not allowed.`, { status: 405 });
};

export const config: Config = {
  // Captures the user hash as the dynamic parameter
  path: ["/cs/meta/:hash"],
};
