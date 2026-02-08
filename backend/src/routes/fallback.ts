// GET /api/v1/videos/:id - YouTube stream fallback via RapidAPI

import { Hono } from "hono";
import { config } from "../config.ts";

const app = new Hono();

const RAPIDAPI_HOST = "yt-api.p.rapidapi.com";

interface VideoDetails {
  title: string;
  channelTitle: string;
  authorId: string;
  lengthSeconds: number;
  isLiveContent: boolean;
  adaptiveFormats: {
    mimeType: string;
    url: string;
    bitrate: number;
    contentLength: string;
    qualityLabel: string;
  }[];
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

// Fetch with key rotation
async function fetchWithKeyRotation(
  keys: string[],
  id: string,
  cgeo: string
): Promise<VideoDetails | null> {
  const key = keys.shift();
  if (!key) {
    return null; // No more keys
  }

  try {
    const res = await fetch(
      `https://${RAPIDAPI_HOST}/dl?id=${id}&cgeo=${cgeo}`,
      {
        headers: {
          "X-RapidAPI-Key": key,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (
      data &&
      Array.isArray(data.adaptiveFormats) &&
      data.adaptiveFormats.length
    ) {
      return data;
    }

    throw new Error(data?.message || "Missing adaptiveFormats");
  } catch {
    // Try next key
    return fetchWithKeyRotation(keys, id, cgeo);
  }
}

app.get("/api/v1/videos/:id", async (c) => {
  const id = c.req.param("id");

  if (!id || id.length < 11) {
    return c.json({ error: "Invalid or missing id" }, 400);
  }

  // Get country from header (set by nginx/CDN) or default to IN
  const cgeo = c.req.header("cf-ipcountry") || c.req.header("x-country") || "IN";

  if (config.rapidApiKeys.length === 0) {
    return c.json({ error: "No RapidAPI keys configured" }, 503);
  }

  // Copy and shuffle keys
  const keys = shuffle([...config.rapidApiKeys]);

  const streamData = await fetchWithKeyRotation(keys, id, cgeo);

  if (!streamData) {
    return c.json({ error: "All API keys exhausted" }, 503);
  }

  // Transform response to match expected format
  const data = {
    title: streamData.title,
    author: streamData.channelTitle,
    authorId: streamData.authorId,
    lengthSeconds: streamData.lengthSeconds,
    adaptiveFormats: streamData.adaptiveFormats.map((f) => ({
      url: f.url + "&fallback",
      quality: f.qualityLabel,
      type: f.mimeType,
      encoding: f.mimeType.split('codecs="')[1]?.split('"')[0],
      bitrate: String(f.bitrate),
      clen: f.contentLength,
      resolution: f.qualityLabel,
    })),
    recommendedVideos: [],
    captions: [],
    liveNow: streamData.isLiveContent,
    hlsUrl: "",
    dashUrl: "",
  };

  return c.json(data, 200, {
    "Cache-Control": "public, max-age=1800", // 30 min cache
  });
});

export default app;
