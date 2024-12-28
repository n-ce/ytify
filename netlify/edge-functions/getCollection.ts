import { Config, Context } from '@netlify/edge-functions';

export default async (_: Request, context: Context) => {

  const { uid } = context.params;
  const instanceArray: string[] = await fetch(
    'https://raw.githubusercontent.com/n-ce/Uma/main/dynamic_instances.json'
  )
    .then(res => res.json())
    .then(di => di.invidious);
  const array = [];

  if (!uid) return;

  for (let i = 0; i < uid.length; i += 11)
    array.push(uid.slice(i, i + 11));

  const response = await Promise.all(array.map(getData));

  return new Response(JSON.stringify(response), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/collection/:uid'
};

const getIndex = () => Math.floor(Math.random() * instanceArray.length);

const getData = (id: string): Promise<Record<'id' | 'title' | 'author' | 'channelUrl' | 'duration', string>> => fetch(instanceArray[getIndex()] + '/api/v1/videos/' + id)
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

