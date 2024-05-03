import type { Context } from '@netlify/functions';
const api = 'http://noembed.com/embed?url=https://youtube.com/watch?v=';

export default async (req: Request, context: Context) => {

  const param = new URL(req.url).searchParams.get('s') || 'aQvGIIdgFDM';
  const data = await fetch(api + param).then(res => res.json());

  return Response.json(data);
};

