import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'https://ytify.pp.ua',
  'https://ytify.netlify.app',
  'https://ytify.zeabur.app',
  'https://ytify-zeta.vercel.app',
  'https://ytify-legacy.vercel.app',
  'https://ytify-2nx7.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

export default function wrap<T>(
  req: VercelRequest,
  res: VercelResponse,
  promise: Promise<T>
) {
  const origin = req.headers.origin as string | undefined;
  const allowedOrigin = (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : 'https://ytify.pp.ua';
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  promise
    .then((data) => {
      res.status(200).json(data);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    });
}
