import { getAlbumData } from './helpers/youtube_album_api';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing album ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await getAlbumData(id);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching album data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch album data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}