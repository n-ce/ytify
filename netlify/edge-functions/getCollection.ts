import { Config, Context } from '@netlify/edge-functions';

export default async (_: Request, context: Context) => {

  const { uid } = context.params;
  const cgeo = context.geo.country?.code || 'IN';

  const keys = Netlify.env.get('RAPID_API_KEYS')!.split(',');

  shuffle(keys);

  if (!uid) return;

  const getData = (id: string): Promise<Record<'id' | 'title' | 'author' | 'channelUrl' | 'duration', string>> =>
    fetcher(cgeo, keys, id)
      .then(json => ({
        'id': id,
        'title': json.title,
        'author': json.channelTitle,
        'channelUrl': '/channel/' + json.channelId,
        'duration': convertSStoHHMMSS(json.lengthSeconds)
      }))
      .catch(() => getData(id));

  const array = Array.from({ length: Math.ceil(uid.length / 11) }, (_, i) => uid.slice(i * 11, i * 11 + 11));
  const response = await Promise.all(array.map(getData));

  return new Response(JSON.stringify(response), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/collection/:uid'
};


export function convertSStoHHMMSS(seconds: number): string {
  if (seconds < 0) return '';
  const hh = Math.floor(seconds / 3600);
  seconds %= 3600;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  let mmStr = String(mm);
  let ssStr = String(ss);
  if (mm < 10) mmStr = '0' + mmStr;
  if (ss < 10) ssStr = '0' + ssStr;
  return (hh > 0 ?
    hh + ':' : '') + `${mmStr}:${ssStr}`;
}

const host = 'ytstream-download-youtube-videos.p.rapidapi.com';
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
    contentLength: string
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
