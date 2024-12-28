import { Context, Config } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {

  const req = new URL(request.url);
  const id = req.searchParams.get('s') || '';

  if (id.length < 11) return;

  const response = await context.next();
  const page = await response.text();
  const api = 'https://iv.ggtyler.dev/api/v1/videos/';
  const data = await fetch(api + id).then(res => res.json());
  const music = data.author.endsWith(' - Topic') ? 'https://wsrv.nl?w=180&h=180&fit=cover&url=' : '';
  const thumbnail = `${music}https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`;
  const newPage = page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.author.replace(' - Topic', ''))
    .replace('"ytify"', `"${data.title}"`)
    .replace('ytify.us.kg', `ytify.us.kg?s=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', thumbnail);

  return new Response(newPage, response);
};

export const config: Config = {
  path: '/*'
};
