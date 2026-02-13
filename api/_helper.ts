import type { VercelResponse } from '@vercel/node';

export default function wrap<T>(
  res: VercelResponse,
  promise: Promise<T>
) {
  promise
    .then((data) => {
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
      res.status(200).json(data);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    });
}
