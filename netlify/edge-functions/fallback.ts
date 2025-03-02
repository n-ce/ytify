import { Config, Context } from '@netlify/edge-functions';

export default async (_: Request, context: Context) => {

  const { id } = context.params;
  const cgeo = context.geo.country?.code || 'IN';

  if (!id || id.length < 11) return;
  const keys = Netlify.env.get('rkeys')!.split(',');

  shuffle(keys);

  const streamData = await fetcher(cgeo, keys, id);
  const data = {
    title: streamData.title,
    uploader: streamData.channelTitle,
    uploaderUrl: '/channel/' + streamData.channelId,
    duration: streamData.lengthSeconds,
    audioStreams: streamData.adaptiveFormats
      .filter(_ => _.mimeType.startsWith('audio'))
      .map(_ => ({
        url: _.url + '&fallback',
        quality: `${Math.floor(_.bitrate / 1000)} kbps`,
        mimeType: _.mimeType,
        codec: _.mimeType.split('codecs="')[1]?.split('"')[0],
        bitrate: _.bitrate,
        contentLength: _.contentLength
      })),
    videoStreams: streamData.adaptiveFormats
      .filter(_ => _.mimeType.startsWith('video'))
      .map(_ => ({
        url: _.url + '&fallback', // fallback parameter to indicate it's source
        resolution: _.qualityLabel,
        type: _.mimeType,
      })),
    relatedStreams: [], // empty array for compatibility
    captions: [], // empty array for compatibility
    livestream: streamData.isLiveContent
  };

  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/streams/:id',
};

const host = 'yt-api.p.rapidapi.com';
export const fetcher = (cgeo: string, keys: string[], id: string): Promise<{
  title: string,
  channelTitle: string,
  channelId: string,
  lengthSeconds: number,
  isLiveContent: boolean,
  adaptiveFormats: {
    mimeType: string,
    url: string,
    bitrate: number,
    contentLength: string,
    qualityLabel: string
  }[]
}> => fetch(`https://${host}/dl?id=${id}&cgeo=${cgeo}`, {
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
  .catch(() => fetcher(cgeo, keys, id));



export function shuffle(array: string[]) {
  let currentIndex = array.length;

  while (currentIndex != 0) {

    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}
