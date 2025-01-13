import { Config } from '@netlify/edge-functions';

export default async (request: Request) => {

  const url = new URL(request.url);
  const [type, id] = url.search.split('=');


  return new Response(`     
<!doctype html>
<html lang="en">

<head>
  <meta charset="UTF-8">

  <meta name="description"
    content="${id}">
  <meta name="author" content="n-ce">
  <meta name="thumbnail" content="/ytify_thumbnail_min.webp">

  <meta property="og:type" content="website">
  <meta property="og:title" content="ytify">
  <meta property="og:url" content="https://ytify.us.kg">
  <meta property="og:site_name" content="ytify">
  <meta property="og:description" content="${type}">
  <meta property="og:image" content="/ytify_thumbnail_min.webp">

  <title>${id} | ytify</title>
</head>
${type + id}
<script></script>
</html>
    `);
};

export const config: Config = {
  path: '/list'
};


