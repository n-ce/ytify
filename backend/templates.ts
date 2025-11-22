// backend/templates.ts

export function generateLinkPreviewHtml(id: string, title: string, channelTitle: string, thumbnail: string): string {
    const cleanChannelTitle = channelTitle.replace(' - Topic', '');
    return `     
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description"
    content="${title} by ${cleanChannelTitle} in ytify">
  <meta name="author" content="n-ce">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:url" content="https://ytify.pp.ua/s/${id}">
  <meta property="og:site_name" content="ytify">
  <meta property="og:description" content="${title} by ${cleanChannelTitle} in ytify">
  <meta property="og:image" content="${thumbnail}">
  <title>${title} | ytify</title>
</head>
<script>location.replace('/?s=${id}')</script></html>
    `;
}

export function generateListPreviewHtml(type: string, id: string, path: string, search: string): string {
    return `     
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description"
    content="View ${type} in ytify">
  <meta name="author" content="n-ce">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${type} | ytify">
  <meta property="og:url" content="https://ytify.pp.ua">
  <meta property="og:site_name" content="ytify">
  <meta property="og:description" content="View ${id} - ${type} in ytify">
  <title>${type} | ytify</title>
</head>
<script>location.replace('/?e=' + encodeURI('${path}${search}'))</script></html>
    `;
}
