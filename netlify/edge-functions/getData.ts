import { Config } from '@netlify/edge-functions';
import { getData } from './public';


export default async (request: Request) => {

  const req = new URL(request.url);
  const id = req.searchParams.get('id');
  if (!id || id.length < 11) return;
  const data = await getData(id).catch(() => getData(id));

  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/streams',
};

