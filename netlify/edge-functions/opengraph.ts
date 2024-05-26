import { Context, Config } from '@netlify/edge-functions';

const keywords = 'ytify,yify, Ytify, Youtube, youtube, Music,music, audio,opus, 32kbps,64kbps,Free ,spotify ,streaming, music-player ,  youtube-player , free-music, ytmusic';
const description = "48-160kbps Opus YouTube Audio Streaming Web App.";
const url = 'https://ytify.netlify.app';

export default async (request: Request, context: Context) => {

  const id = new URL(request.url).searchParams.get('s');


  if (!id) return;

  const response = await context.next();
  let page = await response.text();

  await fetch('https://pipedapi.drgns.space/streams/' + id)
    .then(res => res.json())
    .then(data => {
      const audioSrc = data.audioStreams.find((v: { itag: number }) => v.itag == 139).url;

      page = page
        .replace(keywords, data.tags)
        .replace(description, data.uploader)
        .replace('"ytify"', `"${data.title}"`)
        .replace(url, `${url}?s=${id}`)
        .replaceAll('/ytify_thumbnail_min.webp', data.thumbnailUrl)
        .replace('<!-- og:audio insertion point -->', `<meta property="og:audio" content="${audioSrc}"`);
    });

  return new Response(page, response);
};

export const config: Config = {
  path: '/*',
};
