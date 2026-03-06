import getAlbum from './getAlbum.js';
import getArtist from './getArtist.js';
import getChannel from './getChannel.js';
import getGallery from './getGallery.js';
import getPlaylist from './getPlaylist.js';
import getSearch from './getSearch.js';
import getSearchSuggestions from './getSearchSuggestions.js';
import getSimilar from './getSimilar.js';
import getSubFeed from './getSubFeed.js';
import type { Request, ExecutionContext } from '@cloudflare/workers-types';

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

export interface Env {
  // Add any environment variables here if needed
}

export default {
  async fetch(
    request: Request,
    _env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowedOrigin = (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : 'https://ytify.pp.ua';

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const path = url.pathname.replace(/^\/api\//, '').replace(/^\//, '');
    const searchParams = url.searchParams;

    try {
      let data: unknown;

      switch (path) {
        case 'album': {
          const id = searchParams.get('id');
          if (!id) throw new Error('Missing id parameter');
          data = await getAlbum(id);
          break;
        }
        case 'artist': {
          const id = searchParams.get('id');
          if (!id) throw new Error('Missing id parameter');
          data = await getArtist(id);
          break;
        }
        case 'channel': {
          const id = searchParams.get('id');
          if (!id) throw new Error('Missing id parameter');
          data = await getChannel(id);
          break;
        }
        case 'gallery': {
          const id = searchParams.get('id');
          if (!id) throw new Error('Missing id parameter');
          data = await getGallery(id.split(','));
          break;
        }
        case 'playlist': {
          const id = searchParams.get('id');
          const all = searchParams.get('all') === 'true';
          if (!id) throw new Error('Missing id parameter');
          data = await getPlaylist(id, all);
          break;
        }
        case 'search': {
          const q = searchParams.get('q');
          const f = searchParams.get('f');
          if (!q) throw new Error('Missing q parameter');
          data = await getSearch({ q, f: f || undefined });
          break;
        }
        case 'search-suggestions': {
          const q = searchParams.get('q');
          const music = searchParams.get('music') === 'true';
          if (!q) throw new Error('Missing q parameter');
          data = await getSearchSuggestions({ q, music });
          break;
        }
        case 'similar': {
          const title = searchParams.get('title');
          const artist = searchParams.get('artist');
          const limit = searchParams.get('limit');
          if (!title || !artist) throw new Error('Missing title or artist parameter');
          data = await getSimilar({ title, artist, limit: limit || undefined });
          break;
        }
        case 'subfeed': {
          const id = searchParams.get('id');
          if (!id) throw new Error('Missing id parameter');
          data = await getSubFeed(id.split(','));
          break;
        }
        default:
          return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600'
        }
      });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return new Response(JSON.stringify({ error: message }), {
        status: message.startsWith('Missing') ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
