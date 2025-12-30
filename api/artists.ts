import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getArtistData } from '../src/backend/youtube_artist_api.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const countryCode = request.headers['x-vercel-ip-country'] as string || 'US';
  const artistIdParam = request.query.id;

  if (request.method !== 'GET') {
    response.setHeader('Allow', ['GET']);
    return response.status(405).end(`Method ${request.method} Not Allowed`);
  }

  if (!artistIdParam) {
    return response.status(400).json({ error: 'Missing artist id parameter' });
  }

  try {
    if (typeof artistIdParam === 'string' && artistIdParam.includes(',')) {
      // Handle multiple artists for the Hub
      const artistIds = artistIdParam.split(',');
      const artistDataPromises = artistIds.map(id => getArtistData(id, countryCode));
      const results = await Promise.all(artistDataPromises);
      // Use destructuring to exclude albums from the results before sending to the hub
      const resultsWithoutAlbums = results.map(({ albums, ...rest }) => rest);
      return response.status(200).json(resultsWithoutAlbums);
    } else {
      // Handle single artist with reduced response
      const artistData = await getArtistData(artistIdParam as string, countryCode);
      const { artistName, playlistId, albums, thumbnail } = artistData;
      return response.status(200).json({ artistName, playlistId, albums, thumbnail });
    }
  } catch (error) {
    console.error('Error in API handler (GET):', error);
    return response.status(500).json({ error: 'Something went wrong' });
  }
}
