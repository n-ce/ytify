import { Config, Context } from '@netlify/edge-functions';

export default async (_: Request, context: Context) => {

  const { id } = context.params;
  if (!id || id.length < 11) return;
  const host = 'ytstream-download-youtube-videos.p.rapidapi.com';
  const url = `https://${host}/dl?id=${id}`;
  const RAPID_API_KEYS = Netlify.env.get('RAPID_API_KEYS')!.split(',');

  const fetcher = (): Promise<{}> => fetch(url, {
    headers: {
      'X-RapidAPI-Key': <string>RAPID_API_KEYS.shift(),
      'X-RapidAPI-Host': host
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data && 'adaptiveFormats' in data && data.adaptiveFormats.length)
        return data;
      else throw new Error(data.message);
    })
    .catch(fetcher);

  const data = await fetcher();


  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/streams/:id',
};



/*
function extractAudioStreams(adaptiveFormats: {}[]) {
  return !adaptiveFormats || adaptiveFormats?.length === 0 ?
    [] : adaptiveFormats
      .filter((f) => f.mimeType.startsWith('audio'))
      .map((f) => ({
        url: f.url,
        quality: `${Math.floor(f.bitrate / 1000)} kbps`,
        mimeType: f.mimeType,
        codec: f.mimeType.split('codecs="')[1]?.split('"')[0],
        bitrate: f.bitrate,
        contentLength: f.contentLength ? parseInt(f.contentLength, 10) : null,
        audioQuality: f.audioQuality || '',
      }))

}
*/
