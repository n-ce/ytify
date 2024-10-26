import { Context, Config } from '@netlify/edge-functions';
import { getData } from './public';


export default async (request: Request, context: Context) => {

  const req = new URL(request.url);
  const id = req.searchParams.get('s');

  if (id?.length !== 11) return;

  const response = await context.next();
  const page = await response.text();
  const data = await getData(id).catch(() => getData(id));
  const music = data.author.endsWith(' - Topic') ? 'https://wsrv.nl?w=180&h=180&fit=cover&url=' : '';
  const thumbnail = music + data.videoThumbnails.find(v => v.quality === 'medium')?.url;
  const newPage = page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.author.replace(' - Topic', ''))
    .replace('"ytify"', `"${data.title}"`)
    .replace('ytify.netlify.app', `ytify.netlify.app?s=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', thumbnail);

  return new Response(newPage, response);
};

export const config: Config = {
  path: '/*',
};


