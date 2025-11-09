import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getArtistData } from './helpers/youtube_artist_api.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const countryCode = request.headers['x-vercel-ip-country'] as string || 'US';

  if (request.method === 'POST') {
    // Handle multiple artists for the Hub
    const { artistIds } = request.body;
    if (!artistIds || !Array.isArray(artistIds)) {
      return response.status(400).json({ error: 'Missing or invalid artistIds in request body' });
    }

    try {
      const artistDataPromises = artistIds.map(id => getArtistData(id, countryCode));
      const results = await Promise.all(artistDataPromises);
      // Use destructuring to exclude albums from the results before sending to the hub
      const resultsWithoutAlbums = results.map(({ albums, ...rest }) => rest);
      return response.status(200).json(resultsWithoutAlbums);
    } catch (error) {
      console.error('Error in API handler (POST):', error);
      return response.status(500).json({ error: 'Something went wrong' });
    }
  } else if (request.method === 'GET') {
    // Handle single artist with reduced response
    const artistId = request.query.id as string;
    if (!artistId) {
      return response.status(400).json({ error: 'Missing artist id parameter' });
    }

    try {
      const artistData = await getArtistData(artistId, countryCode);
      const { artistName, playlistId, albums } = artistData;
      return response.status(200).json({ artistName, playlistId, albums });
    } catch (error) {
      console.error('Error in API handler (GET):', error);
      return response.status(500).json({ error: 'Something went wrong' });
    }
  } else {
    response.setHeader('Allow', ['GET', 'POST']);
    return response.status(405).end(`Method ${request.method} Not Allowed`);
  }
}
