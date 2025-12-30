import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAlbumData } from '../src/backend/youtube_album_api.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const countryCode = request.headers['x-vercel-ip-country'] as string || 'US';
  const albumId = request.query.id as string;

  if (request.method !== 'GET') {
    response.setHeader('Allow', ['GET']);
    return response.status(405).end(`Method ${request.method} Not Allowed`);
  }

  if (!albumId) {
    return response.status(400).json({ error: 'Missing album ID' });
  }

  try {
    const data = await getAlbumData(albumId, countryCode);

    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return response.status(200).json(data);
  } catch (error) {
    console.error('Error fetching album data:', error);
    return response.status(500).json({ error: 'Failed to fetch album data' });
  }
}
