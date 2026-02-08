// GET /s/:id - Link preview with Open Graph meta tags

import { Hono } from "hono";
import { config } from "../config.ts";

const app = new Hono();

const RAPIDAPI_HOST = "yt-api.p.rapidapi.com";

interface VideoData {
  title: string;
  channelTitle: string;
}

// Shuffle array in place (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length;

  while (currentIndex !== 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

// Fetch video data with key rotation
async function fetchVideoData(
  keys: string[],
  id: string
): Promise<VideoData | null> {
  const key = keys.shift();
  if (!key) {
    return null;
  }

  try {
    const res = await fetch(`https://${RAPIDAPI_HOST}/dl?id=${id}`, {
      headers: {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && "adaptiveFormats" in data && data.adaptiveFormats.length) {
      return data;
    }

    throw new Error(data?.message || "Invalid response");
  } catch {
    return fetchVideoData(keys, id);
  }
}

app.get("/s/:id", async (c) => {
  const id = c.req.param("id");

  if (!id || id.length < 11) {
    return c.redirect("/");
  }

  if (config.rapidApiKeys.length === 0) {
    return c.redirect(`/?s=${id}`);
  }

  const keys = shuffle([...config.rapidApiKeys]);
  const data = await fetchVideoData(keys, id);

  if (!data) {
    return c.redirect(`/?s=${id}`);
  }

  // Determine if it's a music topic channel
  const isMusic = data.channelTitle.endsWith(" - Topic");
  const thumbnail = isMusic
    ? `https://wsrv.nl?w=180&h=180&fit=cover&url=https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`
    : `https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`;

  const artistName = data.channelTitle.replace(" - Topic", "");
  const siteUrl = config.allowedOrigins[0] || "https://ytify.pp.ua";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description" content="${escapeHtml(data.title)} by ${escapeHtml(artistName)} in ytify">
  <meta name="author" content="n-ce">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(data.title)}">
  <meta property="og:url" content="${siteUrl}/s/${id}">
  <meta property="og:site_name" content="ytify">
  <meta property="og:description" content="${escapeHtml(data.title)} by ${escapeHtml(artistName)} in ytify">
  <meta property="og:image" content="${thumbnail}">
  <title>${escapeHtml(data.title)} | ytify</title>
</head>
<script>location.replace('/?s=${id}')</script>
</html>`;

  return c.html(html);
});

// Escape HTML to prevent XSS
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default app;
