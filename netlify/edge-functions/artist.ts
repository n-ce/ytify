import type { Config, Context } from "@netlify/edge-functions";
import { getArtistData } from 'backend/services/youtube_artist';

export default async (_req: Request, context: Context) => {
  const artistId = context.params.id;
  const countryCode = context.geo?.country?.code || 'US';

  if (!artistId) {
    return new Response(JSON.stringify({ error: 'Missing artist ID' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const artistData = await getArtistData(artistId, countryCode);
    if (!artistData || Object.keys(artistData).length === 0) {
      return new Response(JSON.stringify({ error: 'Artist not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    // The Netlify edge function used to return a reduced set of fields.
    // I need to ensure consistency with the Vercel counterpart if the intention is to fully unify.
    // For now, I'll match the original Netlify Edge function's output fields.
    const { artistName, playlistId, recommendedArtists, featuredOnPlaylists } = artistData as any;
    const responsePayload = {
      artistName,
      playlistId,
      recommendedArtists,
      featuredOnPlaylists,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching artist data in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Something went wrong' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};

export const config: Config = {
  path: '/artist/:id',
};

