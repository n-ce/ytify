import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";


export default async (req: Request, context: Context) => {

  const { uid } = context.params;
  const collection = getStore('clxn');

  if (uid) {

    const data = await collection.get(uid);
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' }
    });

  } else {

    const data = await req.text();
    const id = Date.now().toString();
    const link = context.site.url + '/list?blob=' + id;

    await collection.set(id, data);

    return new Response(link, {
      headers: { 'content-type': 'text/plain' }
    });

  }
};


export const config: Config = {
  path: ['/blob', '/blob/:uid'],
};
