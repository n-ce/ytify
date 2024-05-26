import { Context, Config } from '@netlify/edge-functions';

const description = "48-160kbps Opus YouTube Audio Streaming Web App.";
const url = 'https://ytify.netlify.app';
const type = '<meta property="og:type" content="website">';

export default async (request: Request, context: Context) => {

  const id = new URL(request.url).searchParams.get('s');


  if (!id) return;

  const response = await context.next();
  let page = await response.text();
  const instance = 'https://invidious.fdn.fr';

  await fetch(instance + '/api/v1/videos/' + id)
    .then(res => res.json())
    .then((data) => {
      let audioSrc = data.adaptiveFormats.find((v: { itag: number }) => v.itag == 139).url;

      if (data.genre === 'Music')
        audioSrc = audioSrc.replace(new URL(audioSrc).origin, instance);

      page = page
        .replace(description, data.author)
        .replace('"ytify"', `"${data.title}"`)
        .replace(url, `${url}?s=${id}`)
        .replace(type, type.replace('website', 'music.song'))
        .replaceAll('/ytify_thumbnail_min.webp', data.videoThumbnails.find((v: { quality: string }) => v.quality === 'medium').url)
        .replace('<!-- og:audio insertion point -->',
          `<meta property="og:audio" content="${audioSrc}">
          <meta property="og:audio:secure_url" content="${audioSrc}">
          <meta property="og:audio:type" content="audio/mpeg">
          <meta property="music.duration" content="${data.lengthSeconds}">`
        );
    });

  return new Response(page, response);
};

export const config: Config = {
  path: '/*',
};
