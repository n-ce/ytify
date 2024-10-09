// handles upcoming query & public collection requests to restore stream lists from any state

import { Config } from '@netlify/edge-functions';
import { convertSStoHHMMSS, instanceArray } from '../../src/neltifyCommons';

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
