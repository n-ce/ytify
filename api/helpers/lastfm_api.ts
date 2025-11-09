export interface LastFmTrack {
  name: string;
  artist: { name: string };
  url: string;
  duration: number;
  playcount: number;
  match: number;
  image: { '#text': string; size: string }[];
}

export interface LastFmSimilarTracksResponse {
  similartracks: {
    track: LastFmTrack[];
    '@attr': { artist: string; 'mbid': string; page: string; perPage: string; totalPages: string; total: string };
  };
}

// New interface for the simplified output
export interface SimplifiedTrack {
  title: string;
  artist: string;
}

export async function getSimilarTracks(
  title: string,
  artist: string,
  apiKey: string,
  limit: string
): Promise<SimplifiedTrack[] | { error: string }> {
  const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&api_key=${apiKey}&limit=${limit}&format=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return { error: data.message };
    }

    // Cast the data to the expected Last.fm type for reliable access
    const lastFmData = data as LastFmSimilarTracksResponse;

    // Check if similar tracks exist
    const tracks = lastFmData.similartracks?.track || [];

    // Map the complex LastFmTrack array to the simple SimplifiedTrack array
    const simplifiedTracks: SimplifiedTrack[] = tracks.map(track => ({
      title: track.name,
      artist: track.artist.name
    }));

    return simplifiedTracks;
  } catch (error) {
    console.error('Error fetching Last.fm similar tracks:', error);
    return { error: 'Failed to fetch similar tracks from Last.fm' };
  }
}
