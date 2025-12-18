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
      const libraryString = await libraryStore.get(userIdHash);

      // If there is no library, return an empty string.
      // The client will be responsible for initializing a default state.
      if (!libraryString) {
        // Return a default minimal structure as a string, as the client expects a parsable object.
        const defaultState = JSON.stringify({
           library_meta: JSON.stringify({ version: 4, tracks: 0 }),
           library_tracks: JSON.stringify({}),
        });
        return new Response(defaultState, {
          status: 200,
          headers: { "Content-Type": "application/json" }, // The *client* treats this as JSON
        });
      }

      // Return the full library snapshot as a string.
      return new Response(libraryString, {
        status: 200,
        headers: { "Content-Type": "application/json" }, // The client will parse this string
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
      const newLibraryString = await req.text();
      
      // Overwrite the entire blob with the new string.
      await libraryStore.set(userIdHash, newLibraryString);

      return new Response(null, { status: 204 }); // Success
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