import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context): Promise<Response> => {
  const userIdHash = context.params.hash;
  if (!userIdHash) {
    return new Response("User ID hash not provided.", { status: 400 });
  }

  // A single store for the entire library snapshot.
  const libraryStore = getStore("library");

  // --- GET: Returns the raw library string. ---
  if (req.method === "GET") {
    try {
      const libraryData = await libraryStore.get(userIdHash, { type: "json" });

      if (!libraryData) {
        const defaultState = {
           meta: { version: 5, tracks: 0 },
           tracks: {},
        };
        return new Response(JSON.stringify(defaultState), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(libraryData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error(`Error reading library for user ${userIdHash}:`, e);
      return new Response("Internal server error during library read.", {
        status: 500,
      });
    }
  }

  // --- PUT: Replaces the entire library string (clean slate). ---
  if (req.method === "PUT") {
    try {
      const newLibraryObject = await req.json();
      
      await libraryStore.set(userIdHash, JSON.stringify(newLibraryObject), {
        metadata: { contentType: "application/json" }
      });

      return new Response(null, { status: 204 }); 
    } catch (e) {
      console.error(`Error writing library for user ${userIdHash}:`, e);
      return new Response("Internal server error during library write.", {
        status: 500,
      });
    }
  }

  return new Response(`Method ${req.method} not allowed.`, { status: 405 });
};

export const config: Config = {
  path: ["/library/:hash"],
};