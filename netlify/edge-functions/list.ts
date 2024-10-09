
import { Context, Config } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {

  const req = new URL(request.url);

  if (!req.searchParams.has('playlists'))
    return;

  const id = req.searchParams.get('playlists');
  const response = await context.next();
  const page = await response.text();
  const data = await fetch('https://pipedapi.kavin.rocks/playlists/' + id).then(res => res.json());
  const newPage = page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.uploader)
    .replace('"ytify"', `"${data.name}"`)
    .replace(<string>context.site.url, `${context.site.url}/list?playlists=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', data.relatedStreams[0].thumbnail);

  return new Response(newPage, response);
}

export const config: Config = {
  path: '/*',
};
