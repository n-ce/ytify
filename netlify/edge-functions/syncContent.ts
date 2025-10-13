// syncContent.ts

import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

// Define the name of the dedicated content store
const CONTENT_STORE_NAME = 'contentStore';

export default async (req: Request, context: Context): Promise<Response> => {
  // The timestamp key is captured by the optional route parameter 'timestamp'
  const timestampKey = context.params.timestamp;

  // Access the dedicated Content Store
  const contentStore = getStore(CONTENT_STORE_NAME);

  // --- POST: Write Immutable Blob (Client -> Server) ---
  // Action: Client sends the full array/object (e.g., history array, channels object).
  // The server saves it and returns the unique timestamp key.
  if (req.method === 'POST') {
    if (timestampKey) {
      // Block POSTs to a specific timestamp key
      return new Response("POST not allowed on a keyed resource.", { status: 405 });
    }

    try {
      const dataToStore = await req.json();

      if (!dataToStore) {
        return new Response("Request body is empty.", { status: 400 });
      }

      // 1. Generate the unique timestamp key (this will be the value stored in the meta file)
      const timestamp = Date.now().toString();

      // 2. CRITICAL: Store the immutable blob keyed by the timestamp
      await contentStore.setJSON(timestamp, dataToStore);

      // SUCCESS: Return the timestamp. The client will use this to update its local meta 
      // and perform the final CAS write on the /cs/meta endpoint.
      return new Response(JSON.stringify({ timestamp: Number(timestamp) }), {
        status: 201, // 201 Created
        headers: { "Content-Type": "application/json" }
      });

    } catch (e) {
      console.error("Error creating immutable content blob:", e);
      return new Response("Internal server error during content creation.", { status: 500 });
    }
  }

  // --- GET: Read Immutable Blob (Server -> Client) ---
  // Action: Client requests the full array/object using the timestamp from the meta file.
  else if (req.method === 'GET') {
    if (!timestampKey) {
      // Block GET without a key
      return new Response("GET requires a timestamp key.", { status: 400 });
    }

    try {
      // CRITICAL: Retrieve the immutable blob keyed by the timestamp
      const contentData = await contentStore.get(timestampKey, { type: 'json' });

      if (!contentData) {
        return new Response("Immutable content not found.", { status: 404 });
      }

      // SUCCESS: Return the full array/object (history, playlist, etc.)
      return new Response(JSON.stringify(contentData), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (e) {
      console.error(`Error reading immutable content blob ${timestampKey}:`, e);
      return new Response("Internal server error during content read.", { status: 500 });
    }
  }

  // --- Unsupported Method ---
  return new Response(`Method ${req.method} not allowed.`, { status: 405 });
};

export const config: Config = {
  // Defines the endpoints: 
  // POST to /cs/content (to create)
  // GET to /cs/content/<timestamp> (to read)
  path: ["/cs/content", "/cs/content/:timestamp"],
};
