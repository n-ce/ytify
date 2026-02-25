import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../src/backend/getArtist.js';
import wrap from './_helper.js';

export default async function (req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing id parameter' });
  }
  return wrap(req, res, handler(id));
}
