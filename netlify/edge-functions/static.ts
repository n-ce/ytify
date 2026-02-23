import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  const { id } = context.params;
  const store = getStore("static");

  // GET: Retrieve immutable content by its key (timestamp)
  if (req.method === "GET") {
    if (!id) {
      return new Response("ID parameter is required.", { status: 400 });
    }

    const data = await store.get(id);

    if (!data) {
      return new Response("Content not found.", { status: 404 });
    }

    return new Response(data, {
      headers: { "content-type": "application/json" },
    });
  }

  // POST: Write new immutable content
  if (req.method === "POST") {
    const data = await req.json();
    if (!data) {
      return new Response("Request body is missing.", { status: 400 });
    }

    const timestamp = Date.now();
    const key = String(timestamp);

    await store.setJSON(key, data, {
      metadata: { lastModified: timestamp.toString() }
    });

    // Return the key (timestamp) to the client
    return new Response(JSON.stringify({ timestamp }), {
      status: 201, // Created
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle unsupported methods
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, POST" },
  });
};

export const config: Config = {
  path: ["/ss", "/ss/:id"], // "ss" for "Static Storage"
};
