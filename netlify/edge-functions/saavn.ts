import { Config, Context } from '@netlify/edge-functions';

export default async (_: Request, context: Context) => {
  const { query } = context.params; // Single parameter named 'query'

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const saavnSearchUrl = `https://www.jiosaavn.com/api.php?p=1&_format=json&__call=search.getResults&q=${query}`;

    const searchRes = await fetch(saavnSearchUrl);
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return new Response(JSON.stringify({ error: 'No results found on JioSaavn' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    const songId = searchData.results[0].id;
    const saavnSongUrl = `https://saavn.dev/api/songs/${songId}`;

    const songRes = await fetch(saavnSongUrl);
    const songData = await songRes.json();

    if (!songData.data || songData.data.length === 0 || !songData.data[0].downloadUrl) {
      return new Response(JSON.stringify({ error: 'Download URL not found for this song' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    const downloadUrls = songData.data[0].downloadUrl;

    return new Response(JSON.stringify({dl: downloadUrls, src: searchData}), {
      headers: { 'content-type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching JioSaavn data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch download URLs' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};

export const config: Config = {
  path: '/saavn/:query', // Define the single parameter in the path
};
