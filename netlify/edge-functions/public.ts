// handles upcoming query & public collection requests to restore stream lists from any state

import { Config } from '@netlify/edge-functions';


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


const instanceArray: string[] = await fetch('https://piped-instances.kavin.rocks')
  .then(res => res.json())
  .then(data => data.map((i: { api_url: string }) => i.api_url + '/streams/'))
  .catch(() => ['https://pipedapi.kavin.rocks/streams/']);

await fetch('https://api.invidious.io/instances.json')
  .then(res => res.json())
  .then(data => {
    for (const i of data)
      if (i[1].cors && i[1].api)
        instanceArray.push(i[1].uri + '/api/v1/videos/')
  })
  .catch(() => instanceArray.push('https://invidious.fdn.fr/api/v1/videos/'));


const getIndex = () => Math.floor(Math.random() * instanceArray.length);


export default async (request: Request) => {

  const uid = new URL(request.url).searchParams.get('id');

  if (!uid) return;

  const array = [];
  for (let i = 0; i < uid.length; i += 11)
    array.push(uid.slice(i, i + 11));

  const getData = (id: string): Promise<Record<'id' | 'title' | 'author' | 'channelUrl' | 'duration', string>> => fetch(instanceArray[getIndex()] + id)
    .then(res => res.json())
    .then(res => {
      if ('error' in res)
        throw new Error(res.error)
      else return res;
    })
    .then(json => ({
      'id': id,
      'title': json.title,
      'author': (json.uploader || json.author).replace(' - Topic', ''),
      'channelUrl': json.authorUrl || json.uploaderUrl,
      'duration': convertSStoHHMMSS(json.duration || json.lengthSeconds)
    }))
    .catch(() => getData(id))

  const response = await Promise.all(array.map(getData));

  return new Response(JSON.stringify(response), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/public',
};
