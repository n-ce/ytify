import { Context, Config } from "@netlify/edge-functions";

let keywords = 'ytify,yify, Ytify, Youtube, youtube, Music,music, audio,opus, 32kbps,64kbps,Free ,spotify ,streaming, music-player ,  youtube-player , free-music, ytmusic';
let description = '48-160kbps Opus YouTube Audio Streaming Web App.';
let url = 'https://ytify.netlify.app'

export default async (request: Request, context: Context) => {

  const id = new URL(request.url).searchParams.get('s');

  const response = await context.next();
  let page = await response.text();

  if (id)
    await fetch('https://pipedapi.drgns.space/streams/' + id)
      .then(res => res.json())
      .then(data => {
        keywords = data.tags;
        url += '?s=' + id;
        description = data.description;
        page = page
          .replace('"ytify"', `"${data.title}"`)
          .replaceAll('/ytify_thumbnail_min.webp', data.thumbnailUrl);
      });

  page = page
    .replace('-keywords', keywords)
    .replace('-description', description)
    .replace('-url', url)



  return new Response(page, response);
};

export const config: Config = {
  path: "/*",
};
