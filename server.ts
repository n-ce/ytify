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

const SHARED_HEADERS = {
  'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600',
  'Access-Control-Allow-Origin': '*',
};

Bun.serve({
  port: Number(port),
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const query = url.searchParams;

    // Health check
    if (path === '/health') {
      return new Response('OK', { status: 200 });
    }

    try {
      if (path === '/api/album') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers: SHARED_HEADERS });
        const data = await getAlbum(id);
        return Response.json(data, { headers: SHARED_HEADERS });
      }

      if (path === '/api/artist') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers: SHARED_HEADERS });
        const data = await getArtist(id);
        return Response.json(data, { headers: SHARED_HEADERS });
      }

      if (path === '/api/channel') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers: SHARED_HEADERS });
        const data = await getChannel(id);
        return Response.json(data, { headers: SHARED_HEADERS });
      }

      if (path === '/api/gallery') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers: SHARED_HEADERS });
        const data = await getGallery(id.split(','));
        return Response.json(data, { headers: SHARED_HEADERS });
      }

      if (path === '/api/playlist') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers: SHARED_HEADERS });
        const data = await getPlaylist(id, query.get('all') === 'true');
        return Response.json(data, { headers: SHARED_HEADERS });
      }

      if (path === '/api/search-suggestions') {
        const q = query.get('q');
        if (!q) return Response.json({ error: 'Missing q parameter' }, { status: 400, headers: SHARED_HEADERS });
        const data = await getSearchSuggestions({ q, music: query.get('music') === 'true' });
        return Response.json(data, { headers: SHARED_HEADERS });
      }

      if (path === '/api/search') {
        const q = query.get('q');
        if (!q) return Response.json({ error: 'Missing q parameter' }, { status: 400, headers: SHARED_HEADERS });
        const data = await getSearch({ q, f: query.get('f') || undefined });
        return Response.json(data, { headers: SHARED_HEADERS });
      }

      if (path === '/api/similar') {
        const title = query.get('title');
        const artist = query.get('artist');
        if (!title || !artist) return Response.json({ error: 'Missing title or artist parameter' }, { status: 400, headers: SHARED_HEADERS });
        const data = await getSimilar({ title, artist, limit: query.get('limit') || undefined });
        return Response.json(data, { headers: SHARED_HEADERS });
      }

      if (path === '/api/subfeed') {
        const id = query.get('id');
        if (!id) return Response.json({ error: 'Missing id parameter' }, { status: 400, headers: SHARED_HEADERS });
        const data = await getSubFeed(id.split(','));
        return Response.json(data, { headers: SHARED_HEADERS });
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: SHARED_HEADERS });
    } catch (err) {
      console.error(err);
      return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500, headers: SHARED_HEADERS });
    }
  },
});

console.log(`Server running on port ${port}`);
