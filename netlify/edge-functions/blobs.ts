import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";


export default async (req: Request, context: Context) => {

  const { uid } = context.params;
  const _ = getStore('clxn');

  if (uid) {

    const data = await _.get(uid);
    return new Response(data, {
      headers: { 'content-type': 'application/json' }
    });

  } else {

    const { blobs } = await _.list();
    const now = Date.now();

    blobs.forEach(blob => {
      const oldDate = parseInt(blob.key);
      //const oneWeekInMilliseconds =7*24* 60 * 60 * 1000;
      const expired = (now - oldDate) > (60 * 60 * 1000);

      if (expired) _.delete(blob.key);
    });

    const data = await req.json();
    const id = now.toString();
    const link = context.url.origin + '/list?blob=' + id;

    await _.setJSON(id, data);

    return new Response(link, {
      headers: { 'content-type': 'text/plain' }
    });

  }
};


export const config: Config = {
  path: ['/blob', '/blob/:uid'],
};

