import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../src/backend/getSimilar.js';
import wrap from './_helper.js';

export default async function (req: VercelRequest, res: VercelResponse) {
  const { title, artist, limit } = req.query;
  if (!title || typeof title !== 'string' || !artist || typeof artist !== 'string') {
    return res.status(400).json({ error: 'Missing title or artist parameter' });
  }
  return wrap(res, handler({ 
    title, 
    artist, 
    limit: typeof limit === 'string' ? limit : undefined 
  }));
}
