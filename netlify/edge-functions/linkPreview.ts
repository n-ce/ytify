import { Context, Config } from '@netlify/edge-functions';
import { fetchStreamData } from 'backend/services/rapid_api';
import { generateLinkPreviewHtml } from 'backend/templates';

export default async (_: Request, context: Context) => {
  const { id } = context.params;

  if (!id || id.length < 11) return;

  const keys = process.env.rkeys!.split(',');

  try {
    const data = await fetchStreamData(context.geo?.country?.code || 'US', keys, id);

    if (!data) return;

    const music = data.channelTitle.endsWith(' - Topic') ? 'https://wsrv.nl?w=180&h=180&fit=cover&url=' : '';
    const thumbnail = `${music}https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`;

    const htmlContent = generateLinkPreviewHtml(id, data.title, data.channelTitle, thumbnail);

    return new Response(htmlContent, {
      headers: { 'content-type': 'text/html' },
    });
  } catch (error: any) {
    console.error('Error in linkPreview Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Something went wrong' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};

export const config: Config = {
  path: '/s/:id'
};
