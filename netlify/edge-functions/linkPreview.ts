import { Context, Config } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {

  const req = new URL(request.url);
  const id = req.searchParams.get('s');

  if (id.length < 11) return;

  const response = await context.next();
  const page = await response.text();
  const newPage = await streamHandler(page, id);

  return new Response(newPage, response);
};

export const config: Config = {
  path: '/*',
};


async function streamHandler(page: string, id: string) {
  const instance = 'https://shashwatmeta.vercel.app/metadata/';
  const data = await fetch(instance + id).then(res => res.json());
  const music = data.author.endsWith(' - Topic') ? 'https://wsrv.nl?w=180&h=180&fit=cover&url=' : '';
  const thumbnail = music + 'https://i.ytimg.com/vi_webp/'+id+'/mqdefault.webp';
  return page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.author.replace(' - Topic', ''))
    .replace('"ytify"', `"${data.title}"`)
    .replace('ytify.us.kg', `ytify.us.kg?s=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', thumbnail);
}

