import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSongPayload } from './helpers/jioSaavn.js';

const parseDurationToSeconds = (durationStr: string): number | null => {
  if (!durationStr) return null;
  const parts = durationStr.split(':').map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
};

export default async function (req: VercelRequest, res: VercelResponse) {
  const title = req.query.title as string;
  const artist = req.query.artist as string;
  const durationParam = req.query.duration as string;

  if (!title || !artist) {
    return res.status(400).send('Missing title or artist parameters');
  }

  const jioSaavnApiUrl = `https://www.jiosaavn.com/api.php?_format=json&_marker=0&api_version=4&ctx=web6dot0&__call=search.getResults&q=${encodeURIComponent(`${title.replace(/\(.*?\)/g, '')} ${artist}`)}&p=0&n=10`;

  try {
    const response = await fetch(jioSaavnApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JioSaavn API returned ${response.status}: ${errorText}`);
    }
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).send('Music stream not found in JioSaavn results');
    }

    const processedResults = data.results.map((rawSong: any) => createSongPayload(rawSong));

    const matchingTrack = processedResults.find((track: any) => {
      const normalizeString = (str: string) => str.normalize("NFD").replace(/[̀-ͯ]/g, "");
      
      const primaryArtists = track.artists?.primary?.map((artist: any) => artist.name.trim()) || [];
      const singers = track.artists?.all?.filter((artist: any) => artist.role === 'singer').map((artist: any) => artist.name.trim()) || [];
      const allArtists = [...primaryArtists, ...singers];

      const artistMatches = allArtists.some((trackArtistName: string) =>
        normalizeString(trackArtistName).toLowerCase().startsWith(normalizeString(artist).toLowerCase())
      );

      const clean = (str: string) => normalizeString(str).toLowerCase().replace(/&amp;/g, ' ').replace(/&/g, ' ').replace(/\s+/g, ' ').trim();

      const titleMatches = clean(track.name).startsWith(clean(title));

      let durationMatches = true;
      if (durationParam) {
        const targetDurationSeconds = parseDurationToSeconds(durationParam);
        if (targetDurationSeconds !== null && track.duration !== null) {
          durationMatches = Math.abs(track.duration - targetDurationSeconds) <= 2;
        } else {
          durationMatches = false;
        }
      }

      return titleMatches && artistMatches && durationMatches;
    });

    if (!matchingTrack || !matchingTrack.downloadUrl) {
      return res.status(404).send('Music stream not found in JioSaavn results');
    }

    return res.status(200).send(matchingTrack.downloadUrl);

  } catch (error: any) {
    console.error("Error in fast-saavn API:", error);
    return res.status(500).send(error.message || 'Internal Server Error');
  }
}