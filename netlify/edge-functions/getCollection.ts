import { Config, Context } from '@netlify/edge-functions';
import { fetcher, convertSStoHHMMSS, shuffle } from './commons/commons';

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

