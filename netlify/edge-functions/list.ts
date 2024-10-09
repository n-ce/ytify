import { Context, Config } from '@netlify/edge-functions';


export default async (request: Request, context: Context) => {

  const req = new URL(request.url);

  const id = req.searchParams.get('s') || req.searchParams.get('playlists') || '';


  const response = await context.next();

  async function playlistHandler(id: string) {

    const data = await fetch('https://pipedapi.kavin.rocks/playlists/' + id).then(res => res.json());
    return html
      .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.uploader)
      .replace('"ytify"', `"${data.name}"`)
      .replace('ytify.netlify.app', `ytify.netlify.app/list?playlists=${id}`)
      .replaceAll('/ytify_thumbnail_min.webp', data.relatedStreams[0].thumbnail);

  }
  const newPage = await playlistHandler(id);

  return new Response(newPage, response);
};

export const config: Config = {
  path: '/list',
};

const html = `
<!doctype html>
<html lang="en">
<head>
<meta property="og:type" content = "website" >
  <meta property="og:title" content = "ytify" >
    <meta property="og:url" content = "https://ytify.netlify.app" >
      <meta property="og:site_name" content = "ytify" >
        <meta property="og:description" content = "48-160kbps Opus YouTube Audio Streaming Web App." >
          <meta property="og:image" content = "/ytify_thumbnail_min.webp" >
</head>
</html>
`;
