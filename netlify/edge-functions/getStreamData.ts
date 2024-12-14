import { Config } from '@netlify/edge-functions';

export default async (request: Request) => {

  const req = new URL(request.url);
  const id = req.searchParams.get('id');
  if (!id || id.length < 11) return;
  const host = 'ytstream-download-youtube-videos.p.rapidapi.com';
  const url = `https://${host}/dl?id=${id}`;
  const RAPID_API_KEYS = Netlify.env.get('RAPID_API_KEYS')!.split(',');
  const fetcher = (): Promise<{}> => fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPID_API_KEYS[Math.floor(Math.random() * RAPID_API_KEYS.length)],
      'X-RapidAPI-Host': 'ytstream-download-youtube-videos.p.rapidapi.com'
    }
  }).catch(fetcher);

  const data = await fetcher();

  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/streams',
};







