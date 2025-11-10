import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";


export default async (req: Request, context: Context) => {

  const { uid } = context.params;
  const collectionBlob = getStore('clxn');

  if (uid) {

    const data = await collectionBlob.get(uid);
    return new Response(data, {
      headers: { 'content-type': 'application/json' }
    });

  } else {

    const data = await req.json();
    if (!data) return;

    const { blobs } = await collectionBlob.list();
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    blobs.forEach(blob => {
      const oldDate = parseInt(blob.key);
      const expired = (now - oldDate) > oneWeek;
      if (expired) collectionBlob.delete(blob.key);
    });

    const id = now.toString();
    const link = context.url.origin + '?si=' + id;

    await collectionBlob.setJSON(id, data);

    return new Response(link, {
      headers: { 'content-type': 'text/plain' }
    });

  }
};


export const config: Config = {
  path: ['/blob', '/blob/:uid'],
};

