
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
      const timestamp = await hashStore.get(blob.key);
      const oldDate = parseInt(timestamp);
      const expired = (now - oldDate) > oneWeek;

      if (expired) {
        await hashStore.delete(blob.key);
        await blobStore.delete(timestamp);
      }
    }


    const timestamp = Date.now().toString();
    await hashStore.set(hash, timestamp);
    await blobStore.setJSON(timestamp, data);

    return new Response(null, { status: 204 });

  } else {

    const timestamp = await hashStore.get(hash);
    let data = null;
    if (timestamp) {
      data = await blobStore.get(timestamp);
      if (data)
        return new Response(data, { headers: { "Content-Type": "application/json" } });
    }
    if (!data)
      return new Response("Not found", { status: 404 });
  }
};

export const config: Config = {
  path: ["/dbs/:hash"],
};
