import handler from '../../src/backend/getSubFeed.js';
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

  const ids = id.split(',');
  return wrap(handler(ids));
}

export const config = {
  path: "/api/subfeed"
};
