import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  const blobStore = getStore('clxn');
  const hashStore = getStore('hash');
  const hash = context.params.hash;

  if (req.method === 'POST') {

    const data = await req.json();
    if (!data) return;

    const { blobs } = await hashStore.list();
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    for await (const blob of blobs) {
      // FIX 1: Retrieve timestamp as 'text'
      const timestamp = await hashStore.get(blob.key, { type: 'text' }); 
      
      if (timestamp) { 
        const oldDate = parseInt(timestamp as string); 
        const expired = (now - oldDate) > oneWeek;

        if (expired) {
          await hashStore.delete(blob.key);
          await blobStore.delete(timestamp as string); 
        }
      }
    }

    const timestamp = Date.now().toString();
    await hashStore.set(hash, timestamp);
    await blobStore.setJSON(timestamp, data);

    return new Response(null, { status: 204 });

  } else {

    // FIX 2: Retrieve timestamp as 'text'
    const timestamp = await hashStore.get(hash, { type: 'text' }); 
    let data = null;
    
    if (timestamp) {
      // FIX 3: Use get() with { type: 'json' } to retrieve and parse the stored JSON data
      data = await blobStore.get(timestamp as string, { type: 'json' }); 
      
      if (data)
        // Convert the JSON object back to a string for the Response body
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
    }
    
    // If timestamp or data not found
    return new Response("Not found", { status: 404 });
  }
};

export const config: Config = {
  path: ["/dbs/:hash"],
};
