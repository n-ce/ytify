import { Context, Config } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {

  const url = new URL(request.url);
  const id = url.searchParams.get('s');
  if (!id) return;

  const response = await context.next();
  const page = await response.text();

  const standardOG = `
  <meta property="og:url" content="https://ytify.netlify.app">
  <meta property="og:description" content="48-160kbps Opus YouTube Audio Streaming Web App.">
  <meta property="og:image" content="/ytify_thumbnail_min.webp">
  `;
  const newOG = `
  <meta property="og:url" content="https://ytify.netlify.app?s=${id}">
  <meta property="og:description" content="${'this is a test'}">
  <meta property="og:image" content="https://i.ytimg.com/vi/${id}/hqdefault.jpg">
  `

  const updatedPage = page.replace(standardOG, newOG).replace('ytify 6.9', 'test body change response');
  return new Response(updatedPage, response);
};

export const config: Config = {
  path: "/*",
};
