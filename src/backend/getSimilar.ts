import { getClient, streamMapper } from './utils.js';

interface LastFmTrack {
  name: string;
  artist: {
    name: string;
  };
}

interface LastFmSimilarTracksResponse {
  similartracks?: {
    track?: LastFmTrack[];
  };
  error?: number;
  message?: string;
}

export default async function(params: { title: string, artist: string, limit?: string }) {
  const { title, artist, limit = '5' } = params;
  const apiKey = '0867bcb6f36c879398969db682a7b69b';
  const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&api_key=${apiKey}&limit=${limit}&format=json`;

  const response = await fetch(url);
  const data = (await response.json()) as LastFmSimilarTracksResponse;

  if (data.error) {
    throw new Error(data.message);
  }

  const lastFmTracks = data.similartracks?.track || [];
  const yt = await getClient();

  const results = await Promise.all(
    lastFmTracks.map((track) => {
      const query = `${track.name} ${track.artist.name}`;
      return yt.music.search(query, { type: 'song' })
        .then(res => {
          const song = res.songs?.contents?.[0];
          return song ? streamMapper(song) : null;
        })
        .catch(() => null);
    })
  );

  return results
    .filter((item): item is YTItem => item !== null)
    .map(({ subtext, albumId, img, ...rest }) => rest);
}
