import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";


export default async (req: Request, context: Context) => {
  const { uid } = context.params;
  const collection = getStore('clxn');


  if (uid) {

    const data = await collection.get(uid);
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
    });

  }
  else {

    const data = await req.arrayBuffer();
    const id = Date.now().toString();
    const link = context.site.url + '/' + location.pathname + '?blob=' + id;

    await collection.set(id, data);
    return new Response(link);

  }

};


export const config: Config = {
  method: 'POST',
  path: '/blob',
};
