import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchYouTubeMusic } from '../src/backend/youtube_search.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { q, filter } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter "q"' });
  }

  const query = q;
  const searchFilter = (typeof filter === 'string') ? filter : 'all';

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const results = await searchYouTubeMusic(query, searchFilter);
    
    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error searching YouTube Music:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
