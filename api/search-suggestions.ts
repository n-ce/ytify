import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../src/backend/getSearchSuggestions.js';
import wrap from './_helper.js';

export default async function (req: VercelRequest, res: VercelResponse) {
  const { q, music } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing q parameter' });
  }
  return wrap(req, res, handler({ q, music: music === 'true' }));
}
