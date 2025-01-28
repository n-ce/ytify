import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";


export default async (req: Request, context: Context) => {

  const { uid } = context.params;
  const collection = getStore('clxn');

  if (uid) {

    const data = await collection.get(uid);
    return new Response(data, {
      headers: { 'content-type': 'application/json' }
    });

  } else {

    const data = await req.json();
    const id = Date.now().toString();
    const link = context.url + '/list?blob=' + id;

    await collection.setJSON(id, data);

    return new Response(link, {
      headers: { 'content-type': 'text/plain' }
    });

  }
};


export const config: Config = {
  path: ['/blob', '/blob/:uid'],
};
