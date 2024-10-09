import { Context, Config } from '@netlify/edge-functions';


export default async (request: Request, context: Context) => {

  const req = new URL(request.url);

  const id = req.searchParams.get('s') || req.searchParams.get('playlists') || '';

  if (id.length < 11) return;

  const response = await context.next();
  const page = await response.text();

  const newPage = await (id.length === 11 ? streamHandler(page, id) : playlistHandler(page, id));

  return new Response(newPage, response);
};

export const config: Config = {
  path: '/*',
};


async function streamHandler(page: string, id: string) {
  const instance = 'https://invidious.catspeed.cc';
  const data = await fetch(instance + '/api/v1/videos/' + id).then(res => res.json());
  const music = data.author.endsWith(' - Topic') ? 'https://wsrv.nl?w=180&h=180&fit=cover&url=' : '';
  const thumbnail = music + data.videoThumbnails.find((v: { quality: string }) => v.quality === 'medium').url;
  return page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.author.replace(' - Topic', ''))
    .replace('"ytify"', `"${data.title}"`)
    .replace('ytify.netlify.app', `ytify.netlify.app?s=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', thumbnail);
}


async function playlistHandler(page: string, id: string) {

  const data = await fetch('https://pipedapi.kavin.rocks/playlists/' + id).then(res => res.json());
  return page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.uploader)
    .replace('"ytify"', `"${data.name}"`)
    .replace('ytify.netlify.app', `ytify.netlify.app/list?playlists=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', data.relatedStreams[0].thumbnail);

}

