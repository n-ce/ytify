import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getArtistsData } from 'backend/services/youtube_artist';

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
    const result = await getArtistsData(artistIdParam, countryCode);
    return response.status(200).json(result);
  } catch (error) {
    console.error('Error in API handler (GET):', error);
    if (error instanceof Error && error.message === 'Artist not found') {
        return response.status(404).json({ error: 'Artist not found' });
    }
    return response.status(500).json({ error: 'Something went wrong' });
  }
}
