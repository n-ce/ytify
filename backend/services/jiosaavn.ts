// backend/services/jiosaavn.ts
import crypto from 'node-forge'; // Assuming node-forge is available

const parseDurationToSeconds = (durationStr: string): number | null => {
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

// From api/helpers/link.ts
export const createDownloadLinks = (encryptedMediaUrl: string) => {
  if (!encryptedMediaUrl) return ''; // Return empty string for consistency if no link

  const key = '38346591';
  const iv = '00000000';

  const encrypted = crypto.util.decode64(encryptedMediaUrl);
  const decipher = crypto.cipher.createDecipher('DES-ECB', crypto.util.createBuffer(key));
  decipher.start({ iv: crypto.util.createBuffer(iv) });
  decipher.update(crypto.util.createBuffer(encrypted));
  decipher.finish();
  const decryptedLink = decipher.output.getBytes();

  return decryptedLink.replace('http:', 'https:'); // Ensure https
};

// From api/helpers/artist.ts (modified)
export const createArtistMapPayload = (artist: any) => ({
  id: artist.id,
  name: artist.name,
  role: artist.role,
  // image field removed as per user's request
  type: artist.type,
  url: artist.perma_url
});

// From api/helpers/song.ts (modified)
export const createSongPayload = (song: any) => ({
  id: song.id,
  name: song.title,
  type: song.type,
  year: song.year || null,
  releaseDate: song.more_info?.release_date || null,
  duration: song.more_info?.duration ? Number(song.more_info?.duration) : null,
  label: song.more_info?.label || null,
  explicitContent: song.explicit_content === '1',
  playCount: song.play_count ? Number(song.play_count) : null,
  language: song.language,
  hasLyrics: song.more_info?.has_lyrics === 'true',
  lyricsId: song.more_info?.lyrics_id || null,
  url: song.perma_url,
  copyright: song.more_info?.copyright_text || null,
  album: {
    id: song.more_info?.album_id || null,
    name: song.more_info?.album || null,
    url: song.more_info?.album_url || null
  },
  artists: {
    primary: song.more_info?.artistMap?.primary_artists?.map(createArtistMapPayload),
    featured: song.more_info?.artistMap?.featured_artists?.map(createArtistMapPayload),
    all: song.more_info?.artistMap?.artists?.map(createArtistMapPayload)
  },
  // image field removed as per user's request
  downloadUrl: createDownloadLinks(song.more_info?.encrypted_media_url)
});


// Core logic from api/find.ts
export async function findJioSaavnTrack(title: string, artist: string, durationParam?: string) {
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

    const normalizeString = (str: string) => str.normalize("NFD").replace(/[̀-ͯ]/g, "");

    if (!data.results || data.results.length === 0) {
      throw new Error('Music stream not found in JioSaavn results');
    }

    const processedResults = data.results.map((rawSong: any) => createSongPayload(rawSong));

    const matchingTrack = processedResults.find((track: any) => {
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

    if (!matchingTrack) {
      throw new Error('Music stream not found in JioSaavn results');
    }

    // This is the final response structure for the JioSaavn API
    return {
      name: matchingTrack.name,
      year: matchingTrack.year,
      copyright: matchingTrack.copyright,
      duration: matchingTrack.duration,
      label: matchingTrack.label,
      albumName: matchingTrack.album?.name || null,
      artists: [
        ...(matchingTrack.artists?.primary || []),
        ...(matchingTrack.artists?.featured || []),
        ...(matchingTrack.artists?.all || [])
      ].map((artist: any) => ({ name: artist.name, role: artist.role })),
      downloadUrl: matchingTrack.downloadUrl || null
    };
  } catch (error) {
    console.error("Error in JioSaavn service:", error);
    throw error; // Re-throw to be handled by the API wrapper
  }
}