import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";


export default async (req: Request, context: Context) => {
  const { uid } = context.params;
  const collection = getStore("clxn");

  if (uid) {

    const data = await collection.get(uid);
    return new Response(data);

  }
  else {

    const { data } = await req.json();
    const id = Date.now().toString();
    await collection.set(id, data);

    const link = context.site.url + location.pathname + '?blob=' + id;
    return new Response(link);

  }

};


export const config: Config = {
  path: "/blob/:uid",
};
