import type { Context } from '@netlify/functions';
const api = 'http://noembed.com/embed?url=https://youtube.com/watch?v=';

export default async (req: Request, context: Context) => {

  const main_URL = context.site.url as string;
  const param = (new URL(main_URL)).searchParams.get('s') || 'aQvGIIdgFDM';
  const data = await fetch(api + param)
    .then(res => res.json());


  return new Response(
    JSON.stringify(context.params)
  );
};

