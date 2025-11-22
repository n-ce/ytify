import { Config, Context } from '@netlify/edge-functions';
import { fetchStreamData } from 'backend/services/rapid_api';

interface AdaptiveFormat {
  mimeType: string;
  url: string;
  bitrate: number;
  contentLength: string;
  qualityLabel?: string; // qualityLabel can be optional
}

export default async (_: Request, context: Context) => {
  const { id } = context.params;
  const cgeo = context.geo.country?.code || 'IN';

  if (!id || id.length < 11) return;
  const raw = process.env.rkeys;
  if (!raw) {
    throw new Error('Missing environment variable: rkeys');
  }
  const keys = raw.split(',');

  try {
    const streamData = await fetchStreamData(cgeo, keys, id);
    const data = {
      title: streamData.title,
      uploader: streamData.channelTitle,
      uploaderUrl: '/channel/' + streamData.authorId,
      duration: streamData.lengthSeconds,
      audioStreams: streamData.adaptiveFormats
        .filter((_: AdaptiveFormat) => _.mimeType.startsWith('audio'))
        .map((_: AdaptiveFormat) => ({
          url: _.url + '&fallback',
          quality: `${Math.floor(_.bitrate / 1000)} kbps`,
          codec: _.mimeType.split('codecs="')[1]?.split('"')[0],
          bitrate: _.bitrate,
          contentLength: _.contentLength,
          mimeType: _.mimeType,
        })),
      videoStreams: streamData.adaptiveFormats
        .filter((_: AdaptiveFormat) => _.mimeType.startsWith('video'))
        .map((_: AdaptiveFormat) => ({
          url: _.url + '&fallback',
          resolution: _.qualityLabel,
          codec: _.mimeType,
        })),
      relatedStreams: [],
      subtitles: [],
      livestream: streamData.isLiveContent
    };

    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in fallback Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Something went wrong' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};

export const config: Config = {
  path: '/streams/:id',
};
