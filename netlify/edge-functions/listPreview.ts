import { Config } from '@netlify/edge-functions';
import { generateListPreviewHtml } from 'backend/templates';

export default async (request: Request) => {
  const url = new URL(request.url);
  const [type, id] = url.search.substring(1).split('=');

  const htmlContent = generateListPreviewHtml(type, id, url.pathname, url.search);

  return new Response(htmlContent, {
    headers: { 'content-type': 'text/html' },
  });
};

export const config: Config = {
  path: '/list'
};


