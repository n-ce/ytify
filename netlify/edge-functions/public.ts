// handles upcoming query & public collection requests to restore stream lists from any state

import { Config } from '@netlify/edge-functions';


export default async (request: Request) => {

  const uid = new URL(request.url).searchParams.get('id');

  if (!uid) return;

  const array = [];
  for (let i = 0; i < uid.length; i += 11)
    array.push(uid.slice(i, i + 11));

  getData(uid)
    .then(json => ({
      'id': uid,
      'title': json.title,
      'author': json.author.replace(' - Topic', ''),
      'channelUrl': json.authorUrl,
      'duration': convertSStoHHMMSS(json.lengthSeconds)
    }))
    .catch(() => getData(uid))

  const response = await Promise.all(array.map(getData));

  return new Response(JSON.stringify(response), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/public',
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

const getInstance = () => [
  'https://invidious.jing.rocks/api/v1/videos/',
  'https://inv.nadeko.net/api/v1/videos/',
  'https://yt.drgnz.club/api/v1/videos/',
  'https://invidious.privacyredirect.com/api/v1/videos/',
  'https://invidious.catspeed.cc/api/v1/videos',
  'https://inv.qilk.de/api/v1/videos',
  'https://invi.susurrando.com/api/v1/videos'
][Math.floor(Math.random() * 7)];

export const getData = async (id: string): Promise<Invidious> => fetch(getInstance() + id)
  .then(res => res.json())
  .then(res => {
    if (res?.adaptiveFormats)
      return res;
    else throw new Error(res.error);
  });
