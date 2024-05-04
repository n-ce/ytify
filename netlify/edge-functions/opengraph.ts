import { Context, Config } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {

  const url = new URL(request.url);
  const id = url.searchParams.get('s');

  const og = id ? (await fetch('https://pipedapi.drgns.space/streams/' + id)
    .then(res => res.json())
    .then(data => `
  <meta property="og:title" content="${data.title}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ytify.netlify.app?s=${id}">
  <meta property="og:description" content="${data.description}">
  <meta property="og:image" content="${data.thumbnailUrl}">
  `)) : `
  <meta property="og:title" content="ytify">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ytify.netlify.app">
  <meta property="og:description" content="48-160kbps Opus YouTube Audio Streaming Web App.">
  <meta property="og:image" content="/ytify_thumbnail_min.webp">
  `;

  const response = await context.next();
  const page = await response.text();
  const injectionPoint = '<!-- OG Injection Point -->';



  const updatedPage = page.replace(injectionPoint, og);
  return new Response(updatedPage, response);
};

export const config: Config = {
  path: "/*",
};
