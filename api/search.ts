import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../src/backend/getSearch.js';
import wrap from './_helper.js';

export default async function (req: VercelRequest, res: VercelResponse) {
  const { q, f } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing q parameter' });
  }
  return wrap(req, res, handler({ q, f: typeof f === 'string' ? f : undefined }));
}
