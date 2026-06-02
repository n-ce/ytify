import { Config, Context } from '@netlify/edge-functions';

export default async (_: Request, context: Context) => {
  const { id } = context.params;
  const cgeo = context.geo.country?.code || 'IN';
  const build = Netlify.env.get('build') || '';

  // Validation check: ensure ID exists and matches your expected version suffix
  if (!id || !id.endsWith(build)) {
    console.error(`[Validation Mismatch] Version mismatch or missing ID. IP: ${context.ip}, ID: ${id}, Expected suffix: ${build}`);
    
    // Memory-safe lazy-loading ReadableStream
    let chunksSent = 0;
    const chunkSize = 64 * 1024; // 64KB chunks
    const chunk = new Uint8Array(chunkSize);
    const totalChunks = Math.ceil((50 * 1024 * 1024) / chunkSize); // Target: ~50MB

    const stream = new ReadableStream({
      // pull() is called on-demand as the client reads data, preventing memory explosion
      async pull(controller) {
        if (chunksSent >= totalChunks) {
          controller.close();
          return;
        }
        crypto.getRandomValues(chunk);
        controller.enqueue(new Uint8Array(chunk));
        chunksSent++;
      }
    });

    return new Response(stream, {
      headers: { 'content-type': 'application/octet-stream' }
    });
  }

  const realId = id.slice(0, -build.length);

  if (realId.length < 11) {
    return new Response(JSON.stringify({ error: 'Invalid id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  // Edge Functions-native environment lookup
  const raw = Netlify.env.get('rkeys');
  if (!raw) {
    throw new Error('Missing environment variable: rkeys');
  }

  const keys = raw
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error('No RapidAPI keys configured in rkeys');
  }

  shuffle(keys);

  try {
    const streamData = await fetcher(cgeo, keys, realId);
    
    const data = {
      title: streamData.title,
      author: streamData.channelTitle,
      authorId: streamData.authorId,
      lengthSeconds: streamData.lengthSeconds,
      adaptiveFormats: streamData.adaptiveFormats.map(_ => ({
        url: _.url + '&fallback',
        quality: _.qualityLabel, 
        type: _.mimeType,
        encoding: _.mimeType.split('codecs="')[1]?.split('"')[0],
        bitrate: _.bitrate.toString(),
        clen: _.contentLength,
        resolution: _.qualityLabel
      })),
      recommendedVideos: [], 
      captions: [], 
      liveNow: streamData.isLiveContent,
      hlsUrl: '',
      dashUrl: ''
    };

    return new Response(JSON.stringify(data), {
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600'
      },
    });

  } catch (err) {
    console.error(`Execution failed for ID ${realId}: ${(err as Error).message}`);
    
    // Graceful fallback for total API key failure/network drops
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' }
    });
  }
};

export const config: Config = {
  path: '/api/v1/videos/:id',
};

const host = 'yt-api.p.rapidapi.com';
type VideoDetails = {
  title: string,
  channelTitle: string,
  authorId: string,
  lengthSeconds: number,
  isLiveContent: boolean,
  adaptiveFormats: {
    mimeType: string,
    url: string,
    bitrate: number,
    contentLength: string,
    qualityLabel: string
  }[]
};

export const fetcher = async (cgeo: string, keys: string[], id: string): Promise<VideoDetails> => {
  const key = keys.shift();
  if (!key) {
    return Promise.reject(new Error('Exhausted all available RapidAPI keys'));
  }

  return fetch(`https://${host}/dl?id=${id}&cgeo=${cgeo}`, {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': host
    }
  })
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
    .then(data => {
      if (data && Array.isArray(data.adaptiveFormats) && data.adaptiveFormats.length) {
        return data;
      }
      throw new Error(data?.message || 'Missing adaptiveFormats');
    })
    .catch((err) => {
      console.error(`Key rotation triggered. Failed Key: .... Error: ${err.message || err}`);
      // Safely recurse down the remaining keys array
      return fetcher(cgeo, keys, id);
    });
};

export function shuffle(array: string[]) {
  let currentIndex = array.length;
  while (currentIndex != 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
}
