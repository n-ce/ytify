import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSimilarTracks, type SimplifiedTrack } from 'backend/services/lastfm';
import { getYouTubeSong, type YouTubeSong } from 'backend/services/youtube_search';
import { formatDuration } from 'backend/utils';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const { title, artist, limit } = request.query;
  const apiKey = process.env.LASTFM_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'LASTFM_API_KEY is not configured' });
  }

  if (!title || !artist) {
    return response.status(400).json({ error: 'Missing title or artist parameter' });
  }

  try {
    const lastFmData = await getSimilarTracks(title as string, artist as string, apiKey, limit as string || '5');

    if ('error' in lastFmData) {
      return response.status(500).json({ error: lastFmData.error });
    }

    const youtubeSearchPromises = (lastFmData as SimplifiedTrack[]).map(lastFmTrack => {
      const searchQuery = `${lastFmTrack.title} ${lastFmTrack.artist}`;
      return getYouTubeSong(searchQuery);
    });

    const allYoutubeResults = await Promise.all(youtubeSearchPromises);

    const matchedYouTubeSongs: YouTubeSong[] = allYoutubeResults
      .filter((result): result is YouTubeSong => 'id' in result)
      .map(song => ({
        ...song,
        duration: formatDuration(song.duration)
      }));

    return response.status(200).json(matchedYouTubeSongs);
  } catch (error) {
    console.error('Error in API handler:', error);
    return response.status(500).json({ error: 'Something went wrong' });
  }
}
