import getAlbum from './src/backend/getAlbum.js';
import getArtist from './src/backend/getArtist.js';
import getChannel from './src/backend/getChannel.js';
import getGallery from './src/backend/getGallery.js';
import getPlaylist from './src/backend/getPlaylist.js';
import getSearchSuggestions from './src/backend/getSearchSuggestions.js';
import getSearch from './src/backend/getSearch.js';
import getSimilar from './src/backend/getSimilar.js';
import getSubFeed from './src/backend/getSubFeed.js';

const port = process.env.PORT || 3000;

const ALLOWED_ORIGINS = [
  'https://ytify.pp.ua',
  'https://ytify.netlify.app',
  'https://ytify.zeabur.app',
  'https://ytify-zeta.vercel.app',
  'https://ytify-legacy.vercel.app',
  'https://ytify-2nx7.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

function getHeaders(origin: string | null) {
  const allowedOrigin = (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : 'https://ytify.pp.ua';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600',
    'Vary': 'Origin'
  };
}

Bun.serve({
  port: Number(port),
  async fetch(req) {
    const origin = req.headers.get('Origin');
    const url = new URL(req.url);
    const path = url.pathname;
    const query = url.searchParams;

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getHeaders(origin)
      });
    }

    // Health check
    if (path === '/health') {
      return new Response('OK', { status: 200 });
    }

    const headers = getHeaders(origin);

    try {
      if (path === '/api/album') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers });
        const data = await getAlbum(id);
        return Response.json(data, { headers });
      }

      if (path === '/api/artist') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers });
        const data = await getArtist(id);
        return Response.json(data, { headers });
      }

      if (path === '/api/channel') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers });
        const data = await getChannel(id);
        return Response.json(data, { headers });
      }

      if (path === '/api/gallery') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers });
        const data = await getGallery(id.split(','));
        return Response.json(data, { headers });
      }

      if (path === '/api/playlist') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers });
        const data = await getPlaylist(id, query.get('all') === 'true');
        return Response.json(data, { headers });
      }

      if (path === '/api/search-suggestions') {
        const q = query.get('q');
        if (!q) return Response.json({ error: 'Missing q parameter' }, { status: 400, headers });
        const data = await getSearchSuggestions({ q, music: query.get('music') === 'true' });
        return Response.json(data, { headers });
      }

      if (path === '/api/search') {
        const q = query.get('q');
        if (!q) return Response.json({ error: 'Missing q parameter' }, { status: 400, headers });
        const data = await getSearch({ q, f: query.get('f') || undefined });
        return Response.json(data, { headers });
      }

      if (path === '/api/similar') {
        const title = query.get('title');
        const artist = query.get('artist');
        if (!title || !artist) return Response.json({ error: 'Missing title or artist parameter' }, { status: 400, headers });
        const data = await getSimilar({ title, artist, limit: query.get('limit') || undefined });
        return Response.json(data, { headers });
      }

      if (path === '/api/subfeed') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers });
        const data = await getSubFeed(id.split(','));
        return Response.json(data, { headers });
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers });
    } catch (err) {
      console.error(err);
      return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500, headers });
    }
  },
});

console.log(`Server running on port ${port}`);
