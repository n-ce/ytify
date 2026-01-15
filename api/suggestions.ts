import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getYouTubeMusicSuggestions } from '../src/backend/suggestions.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter "q"' });
  }

  const query = q;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const suggestions = await getYouTubeMusicSuggestions(query);
    
    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
