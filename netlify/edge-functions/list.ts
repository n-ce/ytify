
import { Context, Config } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {

  const req = new URL(request.url);

  if (!req.searchParams.has('playlists'))
    return;

  const id = req.searchParams.get('playlists');


  const response = await context.next();
  const page = await response.text();
  const instance = 'https://inv.qilk.de';
  const data = await fetch(instance + '/api/v1/playlists/' + id).then(res => res.json());

  return new Response(data, response);
}

export const config: Config = {
  path: '/list/*',
};
