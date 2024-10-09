
import { Context, Config } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {

  const req = new URL(request.url);

  if (!req.searchParams.has('playlists'))
    return;

  const id = req.searchParams.get('playlists');
  const response = await context.next();
  const page = await response.text();
  const instance = 'https://inv.qilk.de';
  const data = await fetch(instance + '/api/v1/playlists/' + id).then(res => res.json());
  const newPage = page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.author)
    .replace('"ytify"', `"${data.title}"`)
    .replace(<string>context.site.url, `${context.site.url}/list?playlists=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', data.videos[0].videoThumbnails[0].url);

  return new Response(newPage, response);
}

export const config: Config = {
  path: '/list/*',
};
