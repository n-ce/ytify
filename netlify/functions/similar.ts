import handler from '../../src/backend/getSimilar.js';
import wrap from './_helper.js';

export default async function (req: Request) {
  const url = new URL(req.url);
  const title = url.searchParams.get('title');
  const artist = url.searchParams.get('artist');
  const limit = url.searchParams.get('limit');

  if (!title || !artist) {
    return new Response(JSON.stringify({ error: 'Missing title or artist parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return wrap(handler({ 
    title, 
    artist, 
    limit: limit || undefined 
  }));
}

export const config = {
  path: "/api/similar"
};
