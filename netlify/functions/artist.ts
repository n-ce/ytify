import handler from '../../src/backend/getArtist.js';
import wrap from './_helper.js';

export default async function (req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return wrap(handler(id));
}

export const config = {
  path: "/api/artist"
};
