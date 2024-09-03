import { Context, Config } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {

  const req = new URL(request.url);

  if (!req.searchParams.has('s')) return;

  const id = req.searchParams.get('s');

  if (id?.length !== 11) return;

  const response = await context.next();
  const page = await response.text();
  const instance = 'https://invidious.fdn.fr';
  const data = await fetch(instance + '/api/v1/videos/' + id).then(res => res.json());

  if (!data) return;

  /*
   wsrv handler square thumbnails
     'https://wsrv.nl?w=720&h=720&fit=cover&url=';
     cannot use https://github.com/weserv/images/issues/379
  */

  if (data.author.endsWith(' - Topic'))
    data.author = data.author.replace(' - Topic', '');

  const newPage = page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.author)
    .replace('"ytify"', `"${data.title}"`)
    .replace(<string>context.site.url, `${context.site.url}?s=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', data.videoThumbnails.find((v: { quality: string }) => v.quality === 'medium').url);

  return new Response(newPage, response);
};

export const config: Config = {
  path: '/*',
};
