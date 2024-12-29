import { Config, Context } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {

  const { uid } = context.params;
  const url = new URL(request.url);
  
  if (!uid) return;
  
  const getData = (id: string): Promise<Record<'id' | 'title' | 'author' | 'channelUrl' | 'duration', string>> => fetch(url.origin + '/streams/' + id)
    .then(res => res.json())
    .then(res => {
      if ('error' in res)
        throw new Error(res.error)
      else return res;
    })
    .then(json => ({
      'id': id,
      'title': json.title,
      'author': (json.uploader || json.author),
      'channelUrl': json.authorUrl || json.uploaderUrl,
      'duration': convertSStoHHMMSS(json.duration || json.lengthSeconds)
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

function convertSStoHHMMSS(seconds: number): string {
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

