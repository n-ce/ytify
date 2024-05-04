import { Context, Config } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {

  // Just return what was requested without transforming it, 
  // unless we fnd the query parameter for this demo
  const url = new URL(request.url);
  if (!url.searchParams.has('s'))
    return;


  // Get the page content
  const response = await context.next();
  const page = await response.text();
  const id = url.searchParams.get('s');



  const standardOG = `
  <meta property="og:url" content="https://ytify.netlify.app">
  <meta property="og:description" content="32-128kbps Opus YouTube Audio Streaming Web App.">
  <meta property="og:image" content="/ytify_thumbnail_min.webp">
  `;
  const newOG = `
  <meta property="og:url" content="https://ytify.netlify.app?s=${id}">
  <meta property="og:description" content="${'this is a test'}">
  <meta property="og:image" content="https://i.ytimg.com/vi/${id}/hqdefault.jpg">
  `


  const updatedPage = page.replace(standardOG, newOG);
  return new Response(updatedPage, response);
};

export const config: Config = {
  path: "/*",
};
