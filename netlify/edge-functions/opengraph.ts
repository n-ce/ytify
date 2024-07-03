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

  // select the lowest bitrate aac stream i.e itag 139
  let audioSrc = data.adaptiveFormats.find((v: { itag: number }) => v.itag == 139).url;

  // Conditionally only proxy music streams
  if (data.genre === 'Music')
    audioSrc = audioSrc.replace(new URL(audioSrc).origin, instance);

  const newPage = page
    .replace('48-160kbps Opus YouTube Audio Streaming Web App.', data.author.replace(' - Topic', ''))
    .replace('"ytify"', `"${data.title}"`)
    .replace(<string>context.site.url, `${context.site.url}?s=${id}`)
    .replaceAll('/ytify_thumbnail_min.webp', data.videoThumbnails.find((v: { quality: string }) => v.quality === 'medium').url)
    // for audio embedding
    .replace('<!-- a4 -->',
      `<meta property="og:audio" content="${audioSrc}">
      <meta property="og:audio:secure_url" content="${audioSrc}">
      <meta property="og:video" content="${audioSrc}">
      <meta property="og:audio:type" content="audio/aac">
      <meta property="music.duration" content="${data.lengthSeconds}">`
    )
    .replace('"website"', '"music.song"');


  return new Response(newPage, response);
};

export const config: Config = {
  path: '/*',
};
