import { Config, Context } from '@netlify/edge-functions';

export default async (_: Request, context: Context) => {

  const { id } = context.params;
  if (!id || id.length < 11) return;
  const host = 'ytstream-download-youtube-videos.p.rapidapi.com';
  const url = `https://${host}/dl?id=${id}`;
  const RAPID_API_KEYS = Netlify.env.get('RAPID_API_KEYS')!.split(',');

  if (Math.floor(Math.random() * 2))
    RAPID_API_KEYS.reverse();

  const fetcher = (): Promise<{
    title: string,
    channelTitle: string,
    channelId: string,
    lengthSeconds: number,
    isLiveContent: boolean,
    adaptiveFormats: {
      mimeType: string,
      url: string,
      bitrate: number,
      contentLength: string
    }[],
    captions: {
      captionTracks: {
        baseUrl: string,
        name: string
      }[]
    }
  }> => fetch(url, {
    headers: {
      'X-RapidAPI-Key': <string>RAPID_API_KEYS.shift(),
      'X-RapidAPI-Host': host
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data && 'adaptiveFormats' in data && data.adaptiveFormats.length)
        return data;
      else throw new Error(data.message);
    })
    .catch(fetcher);

  const streamData = await fetcher();
  const data = {
    title: streamData.title,
    uploader: streamData.channelTitle,
    uploaderUrl: '/channel/' + streamData.channelId,
    duration: streamData.lengthSeconds,
    audioStreams: streamData.adaptiveFormats
      .filter(_ => _.mimeType.startsWith('audio'))
      .map(_ => ({
        url: _.url,
        quality: `${Math.floor(_.bitrate / 1000)} kbps`,
        mimeType: _.mimeType,
        codec: _.mimeType.split('codecs="')[1]?.split('"')[0],
        bitrate: _.bitrate,
        contentLength: _.contentLength
      })),
    relatedStreams: [],
    subtitles: streamData.captions.captionTracks.map(_ => ({
      url: _.baseUrl,
      name: _.name
    })),
    livestream: streamData.isLiveContent
  };

  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/streams/:id',
};



