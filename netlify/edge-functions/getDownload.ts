import { Config, Context } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {

  const { id } = context.params;
  const url = new URL(request.url);
  const format = url.searchParams.get('f');
  const streamUrl = 'https://youtu.be/' + id;
  const cobalt = 'https://cobalt.api.timelessnesses.me';
  const key = Netlify.env.get('cobalt');
  const dl = await fetch(cobalt, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Api-Key ' + key
    },
    body: JSON.stringify({
      url: streamUrl,
      downloadMode: 'audio',
      audioFormat: format,
      filenameStyle: 'basic'
    })
  })
    .then(_ => _.json())
    .then(_ => {
      if ('url' in _)
        return _;
      else throw new Error(_);
    })
    .catch(_ => _);

  return new Response(JSON.stringify(dl), {
    headers: { 'content-type': 'application/json' },
  });
};

export const config: Config = {
  path: '/download/:id',
};
