import { Config, Context } from '@netlify/edge-functions';

export default async (_: Request, context: Context) => {

  const { id } = context.params;
  const cgeo = context.geo.country?.code || 'IN';

  if (!id || id.length < 11) {
    return new Response(JSON.stringify({ error: 'Invalid or missing id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
  // Edge Functions-native environment lookup
  const raw = Netlify.env.get('rkeys');
  if (!raw) {
    throw new Error('Missing environment variable: rkeys');
  }
  // Split, trim, and remove empty entries
  const keys = raw
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    throw new Error('No RapidAPI keys configured in rkeys');
  }

  shuffle(keys);

  const streamData = await fetcher(cgeo, keys, id);
  const data = {
    title: streamData.title,
    author: streamData.channelTitle,
    authorId: streamData.authorId,
    lengthSeconds: streamData.lengthSeconds,
    adaptiveFormats: streamData.adaptiveFormats
      .map(_ => ({
        url: _.url + '&fallback',
        quality: _.qualityLabel, // qualityLabel from RapidAPI maps to quality/resolution
        type: _.mimeType,
        encoding: _.mimeType.split('codecs="')[1]?.split('"')[0],
        bitrate: _.bitrate.toString(),
        clen: _.contentLength,
        resolution: _.qualityLabel
      })),
    recommendedVideos: [], // empty array for compatibility
    captions: [], // empty array for compatibility
    liveNow: streamData.isLiveContent,
    hlsUrl: '',
    dashUrl: ''
  };

  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
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

export const fetcher = (cgeo: string, keys: string[], id: string): Promise<VideoDetails> => {
  const key = keys.shift();
  if (!key) {
    // no more keys → stop recursion
    return Promise.reject(new Error('Exhausted RapidAPI keys'));
  }

  return fetch(`https://${host}/dl?id=${id}&cgeo=${cgeo}`, {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': host
    }
  })
    .then(res =>
      // ensure we got a 2xx before parsing
      res.ok
        ? res.json()
        : Promise.reject(new Error(`HTTP ${res.status}`))
    )
    .then(data => {
      if (data && Array.isArray(data.adaptiveFormats) && data.adaptiveFormats.length) {
        return data;
      }
      // missing or empty adaptiveFormats
      throw new Error(data?.message || 'Missing adaptiveFormats');
    })
    .catch(() =>
      // on any failure, try the next key
      fetcher(cgeo, keys, id)
    );
};


export function shuffle(array: string[]) {
  let currentIndex = array.length;

  while (currentIndex != 0) {

    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}
