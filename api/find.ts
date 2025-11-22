import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findJioSaavnTrack } from 'backend/services/jiosaavn';

export default async function (req: VercelRequest, res: VercelResponse) {
  const title = req.query.title as string;
  const artist = req.query.artist as string;
  const durationParam = req.query.duration as string;

  if (!title || !artist) {
    return res.status(400).send('Missing title or artist parameters');
  }

  try {
    const result = await findJioSaavnTrack(title, artist, durationParam);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).send(error.message);
    }
    console.error("Error in API handler (find):", error);
    return res.status(500).send(error.message || 'Internal Server Error');
  }
}
