import { Context, Config } from "@netlify/edge-functions";

let keywords = 'ytify,yify, Ytify, Youtube, youtube, Music,music, audio,opus, 32kbps,64kbps,Free ,spotify ,streaming, music-player ,  youtube-player , free-music, ytmusic';
let thumbnail = '/ytify_thumbnail_min.webp';
let title = 'ytify';
let description = '48-160kbps Opus YouTube Audio Streaming Web App.';
let url = 'https://ytify.netlify.app'

export default async (request: Request, context: Context) => {

  const id = new URL(request.url).searchParams.get('s');

  const response = await context.next();
  const page = await response.text();

  if (id)
    await fetch('https://pipedapi.drgns.space/streams/' + id)
      .then(res => res.json())
      .then(data => {
        keywords = data.tags;
        title = data.title;
        url += '?s=' + id;
        description = data.description;
        page.replaceAll(thumbnail, data.thumbnail);
      });

  const updatedPage = page
    .replace('{title}', title)
    .replace('{keywords}', keywords)
    .replace('{description}', description)
    .replace('{url}', url)



  return new Response(updatedPage, response);
};

export const config: Config = {
  path: "/*",
};
