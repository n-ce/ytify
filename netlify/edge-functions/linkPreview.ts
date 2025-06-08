import { Context, Config } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {

  const url = new URL(request.url);
  const id = url.searchParams.get('s') || '';

  if (id.length < 11) return;

  const response = await context.next();
  const page = await response.text();
  const keys = context.env.rkeys.split(',');

  shuffle(keys);

  const data = await fetcher(keys, id);

  if (!data) return;
  const music = data.channelTitle.endsWith(' - Topic') ? 'https://wsrv.nl?w=180&h=180&fit=cover&url=' : '';
  const thumbnail = `${music}https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`;
  const newPage = page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.channelTitle.replace(' - Topic', ''))
    .replace('"ytify"', `"${data.title}"`)
    .replace('ytify.pp.ua', `ytify.pp.ua?s=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', thumbnail);

  return new Response(newPage, response);
};

export const config: Config = {
  path: '/*',
  excludedPath: '/list'
};

const host = 'yt-api.p.rapidapi.com';
export const fetcher = (keys: string[], id: string): Promise<{
  title: string,
  channelTitle: string,
  channelId: string,
  lengthSeconds: number,
  isLiveContent: boolean,
  adaptiveFormats: {
    mimeType: string,
    url: string,
    bitrate: number,
    contentLength: string
  }[]
}> => fetch(`https://${host}/dl?id=${id}`, {
  headers: {
    'X-RapidAPI-Key': <string>keys.shift(),
    'X-RapidAPI-Host': host
  }
})
  .then(res => res.json())
  .then(data => {
    if (data && 'adaptiveFormats' in data && data.adaptiveFormats.length)
      return data;
    else throw new Error(data.message);
  })
  .catch(() => fetcher(keys, id));



export function shuffle(array: string[]) {
  let currentIndex = array.length;

  while (currentIndex != 0) {

    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}
