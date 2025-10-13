import { Context, Config } from '@netlify/edge-functions';

export default async (_: Request, context: Context) => {

  const { id } = context.params;

  if (!id || id.length < 11) return;


  const keys = process.env.rkeys!.split(',');

  shuffle(keys);

  const data = await fetcher(keys, id);

  if (!data) return;
  const music = data.channelTitle.endsWith(' - Topic') ? 'https://wsrv.nl?w=180&h=180&fit=cover&url=' : '';
  const thumbnail = `${music}https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`;

  return new Response(`     
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description"
    content="${data.title} by ${data.channelTitle.replace(' - Topic', '')} in ytify">
  <meta name="author" content="n-ce">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${data.title}">
  <meta property="og:url" content="https://ytify.pp.ua/s/${id}">
  <meta property="og:site_name" content="ytify">
  <meta property="og:description" content="${data.title} by ${data.channelTitle.replace(' - Topic', '')} in ytify">
  <meta property="og:image" content="${thumbnail}">
  <title>${data.title} | ytify</title>
</head>
<script>location.replace('/?s=${id}')</script></html>
    `, {
    headers: { 'content-type': 'text/html' },
  });
};

export const config: Config = {
  path: '/s/:id'
};

const host = 'yt-api.p.rapidapi.com';
export const fetcher = (keys: string[], id: string): Promise<{
  title: string,
  channelTitle: string,
  authorId: string,
  lengthSeconds: number,
  isLiveContent: boolean,
  adaptiveFormats: {
    mimeType: string,
    url: string,
    bitrate: number,
    contentLength: string
  }[]
}> => fetch(`https://${host}/dl?id=${id}`, {
  headers: {
    'X-RapidAPI-Key': <string>keys.shift(),
    'X-RapidAPI-Host': host
  }
})
  .then(res => res.json())
  .then(data => {
    if (data && 'adaptiveFormats' in data && data.adaptiveFormats.length)
      return data;
    else throw new Error(data.message);
  })
  .catch(() => fetcher(keys, id));



export function shuffle(array: string[]) {
  let currentIndex = array.length;

  while (currentIndex != 0) {

    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}
