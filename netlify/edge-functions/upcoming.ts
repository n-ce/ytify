// handles upcoming query requests to restore queue from any where

import { Context, Config } from '@netlify/edge-functions';

function convertSStoHHMMSS(seconds: number) {
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

const pipedInstanceArray = async () => fetch('https://piped-instances.kavin.rocks').then(res => res.json())
  .then(data => data.map((i: { api_url: string }) => i.api_url))
  .catch(() => ['https://pipedapi.kavin.rocks']);

export default async (request: Request, _: Context) => {

  const uid = new URL(request.url).searchParams.get('id');

  if (!uid) return;

  const instanceArray = await pipedInstanceArray();

  const getIndex = () => Math.floor(Math.random() * instanceArray.length);

  const getData = async (
    id: string,
    api: string = instanceArray[getIndex()]
  ): Promise<any> => await fetch(`${api}/streams/${id}`)
    .then(res => res.json())
    .then(json => ({
      'id': id,
      'title': json.title,
      'author': json.uploader,
      'authorId': json.uploaderUrl.slice(9),
      'duration': convertSStoHHMMSS(json.duration),
      'thumbnailUrl': json.thumbnailUrl,
      'source': api
    }))
    .catch(() => getData(id))

  const data = await getData(uid);

  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/upcoming',
};
