import { Context, Config } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {

  const req = new URL(request.url);

  if (!req.searchParams.has('s')) return;

  const id = req.searchParams.get('s');

  if (id?.length !== 11) return;

  const response = await context.next();
  const page = await response.text();
  const instance = 'https://invidious.jing.rocks';
  const data = await fetch(instance + '/api/v1/videos/' + id).then(res => res.json());

  if (!data) return;

  // select the lowest bitrate aac stream i.e itag 139
  let audioSrc = data.adaptiveFormats.find((v: { itag: number }) => v.itag == 139).url;

  // Conditionally only proxy music streams
  if (data.genre === 'Music')
    audioSrc = audioSrc.replace(new URL(audioSrc).origin, instance);
  const music = data.author.endsWith(' - Topic') ? '&w=720&h=720&fit=cover' : '';
  if (music)
    data.author = data.author.replace(' - Topic', '');

  const newPage = page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.author)
    .replace('"ytify"', `"${data.title}"`)
    .replace(<string>context.site.url, `${context.site.url}?s=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', `https://wsrv.nl?url=https://i.ytimg.com/vi_webp/${id}/maxresdefault.webp${music}`);

  return new Response(newPage, response);
};

export const config: Config = {
  path: '/*',
};
