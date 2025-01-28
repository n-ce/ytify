import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";


export default async (req: Request, context: Context) => {
  const collection = getStore('clxn');
  const data = await req.text();
  const id = Date.now().toString();
  const link = context.site.url + '/' + location.pathname + '?blob=' + id;

  await collection.set(id, data);
  return new Response(link, {
    headers: {
      'content-type': 'text/plain'
    }
  });
};


export const config: Config = {
  method: 'POST',
  path: '/blob',
};
