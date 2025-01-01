import { Context, Config } from '@netlify/edge-functions';
import { fetcher, shuffle } from './common/utils';

export default async (request: Request, context: Context) => {

  const url = new URL(request.url);
  const id = url.searchParams.get('s') || '';

  if (id.length < 11) return;

  const response = await context.next();
  const page = await response.text();
  const cgeo = context.geo.country?.code || 'IN';
  const keys = Netlify.env.get('RAPID_API_KEYS')!.split(',');

  shuffle(keys);

  const data = await fetcher(cgeo, keys, id);

  if (!data) return;
  const music = data.channelTitle.endsWith(' - Topic') ? 'https://wsrv.nl?w=180&h=180&fit=cover&url=' : '';
  const thumbnail = `${music}https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`;
  const newPage = page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.channelTitle.replace(' - Topic', ''))
    .replace('"ytify"', `"${data.title}"`)
    .replace('ytify.us.kg', `ytify.us.kg?s=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', thumbnail);

  return new Response(newPage, response);
};

export const config: Config = {
  path: '/*'
};
