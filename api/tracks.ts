import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSimilarTracks, type SimplifiedTrack } from '../src/backend/lastfm_api.js';
import { getYouTubeSong, type YouTubeSong } from '../src/backend/get_youtube_song.js';


export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const { title, artist, limit } = request.query;
  const apiKey = '0867bcb6f36c879398969db682a7b69b';

  if (!apiKey) {
    // For Vercel/serverless environments, use 500 status code for internal configuration errors
    return response.status(500).json({ error: 'LASTFM_API_KEY is not configured' });
  }

  if (!title || !artist) {
    return response.status(400).json({ error: 'Missing title or artist parameter' });
  }

  try {
    // 1. Fetch similar tracks (must be sequential first step)
    const lastFmData = await getSimilarTracks(title as string, artist as string, apiKey, limit as string || '5');

    if ('error' in lastFmData) {
      return response.status(500).json({ error: lastFmData.error });
    }


    // Function to format the duration string
    const formatDuration = (duration: string): string => {
      // Split the duration into minutes and seconds
      const parts = duration.split(':');

      if (parts.length === 2) {
        const [minutesStr, secondsStr] = parts;

        // Pad the minutes part with a leading zero if it's a single digit
        const paddedMinutes = minutesStr.padStart(2, '0');

        // Combine them back
        return `${paddedMinutes}:${secondsStr}`;
      }

      // Return the original string if it's not in the expected 'm:ss' or 'mm:ss' format
      return duration;
    };
    // --- CONCURRENT FETCHING START ---

    // 2. Map the tracks to an array of Promises for concurrent execution.
    // The .map() executes getYouTubeSong immediately for every track.
    const youtubeSearchPromises = (lastFmData as SimplifiedTrack[]).map(lastFmTrack => {
      const searchQuery = `${lastFmTrack.title} ${lastFmTrack.artist}`;
      // Return the Promise without awaiting it
      return getYouTubeSong(searchQuery);
    });

    // 3. Use Promise.all to wait for ALL YouTube searches to complete simultaneously.
    const allYoutubeResults = await Promise.all(youtubeSearchPromises);

    // --- CONCURRENT FETCHING END ---

    // 4. Filter the results to only include successfully matched songs.
    const matchedYouTubeSongs: YouTubeSong[] = allYoutubeResults
      .filter((result): result is YouTubeSong => 'id' in result)
      .map(song => ({
        ...song,
        duration: formatDuration(song.duration)
      }));

    return response.status(200).json(matchedYouTubeSongs);
  } catch (error) {
    // This catches errors from getSimilarTracks, Promise.all, or any unhandled exceptions
    console.error('Error in API handler:', error);
    return response.status(500).json({ error: 'Something went wrong' });
  }
}
