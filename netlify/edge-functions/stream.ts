import { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";

interface RapidAPIState {
  keys: Array<{
    key: string;
    remaining: number;
    resetsat: number;
  }>;
  ips: Record<string, number>;
}

async function getRapidAPIState() {
  const store = getStore("rapidapi");
  try {
    return (await store.get("state", { type: "json" })) as RapidAPIState | null;
  } catch (e) {
    return null;
  }
}

function selectBestKey(state: RapidAPIState | null, allKeys: string[]): string {
  if (!state || !state.keys.length) return allKeys[Math.floor(Math.random() * allKeys.length)];

  const now = Date.now();
  const available = allKeys.map(k => {
    const entry = state.keys.find(e => e.key === k);
    if (!entry) return { key: k, remaining: 500, resetsat: 0 };
    if (now > entry.resetsat) return { ...entry, remaining: 500 };
    return entry;
  });

  // Sort by remaining descending, then by resetsat ascending
  available.sort((a, b) => b.remaining - a.remaining || a.resetsat - b.resetsat);
  return available[0].key;
}

async function updateRapidAPIState(key: string, remaining: number, resetsat: number, ip: string) {
  const store = getStore("rapidapi");
  const state = (await getRapidAPIState()) || { keys: [], ips: {} };
  
  const keyIdx = state.keys.findIndex(k => k.key === key);
  const keyEntry = { key, remaining, resetsat };
  
  if (keyIdx > -1) state.keys[keyIdx] = keyEntry;
  else state.keys.push(keyEntry);
  
  state.ips[ip] = (state.ips[ip] || 0) + 1;
  
  try {
    await store.setJSON("state", state);
  } catch (e) {
    console.error("Failed to update RapidAPI state:", e);
  }
}

export default async (request: Request, context: Context) => {
  const { id } = context.params;
  if (!id || id.length < 11) return new Response("Invalid ID", { status: 400 });

  const accept = request.headers.get("accept") || "";
  const isJson = accept.includes("application/json");

  const rawKeys = Netlify.env.get("rkeys") || "";
  const allKeys = rawKeys.split(",").map(k => k.trim()).filter(Boolean);
  
  if (!allKeys.length) {
    return new Response(JSON.stringify({ error: "No API keys configured" }), { status: 500 });
  }

  let selectedKey = "";
  let state: RapidAPIState | null = null;

  if (isJson) {
    state = await getRapidAPIState();
    selectedKey = selectBestKey(state, allKeys);
  } else {
    selectedKey = allKeys[Math.floor(Math.random() * allKeys.length)];
  }

  try {
    const res = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${id}`, {
      headers: {
        "X-RapidAPI-Key": selectedKey,
        "X-RapidAPI-Host": "yt-api.p.rapidapi.com"
      }
    });

    if (isJson) {
      const remaining = parseInt(res.headers.get("x-ratelimit-requests-remaining") || "0");
      const resetSec = parseInt(res.headers.get("x-ratelimit-requests-reset") || "0");
      await updateRapidAPIState(selectedKey, remaining, Date.now() + resetSec * 1000, context.ip);
    }

    if (!res.ok) throw new Error(`RapidAPI Error: ${res.status}`);
    const data = await res.json();

    if (isJson) {
      return new Response(JSON.stringify({
        title: data.title,
        author: data.channelTitle,
        authorId: data.authorId,
        lengthSeconds: data.lengthSeconds,
        adaptiveFormats: data.adaptiveFormats.map((f: any) => ({
          ...f,
          url: f.url + "&fallback"
        })),
        liveNow: data.isLiveContent
      }), { 
        headers: { 
          "content-type": "application/json",
          "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600"
        } 
      });
    }

    const music = data.channelTitle.endsWith(" - Topic") ? "https://wsrv.nl?w=180&h=180&fit=cover&url=" : "";
    const thumbnail = `${music}https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`;

    return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description" content="${data.title} by ${data.channelTitle.replace(' - Topic', '')} in ytify">
  <meta property="og:title" content="${data.title}">
  <meta property="og:description" content="By ${data.channelTitle.replace(' - Topic', '')}">
  <meta property="og:image" content="${thumbnail}">
  <meta property="og:type" content="website">
  <title>${data.title} | ytify</title>
  <script>location.replace('/?s=${id}')</script>
</head>
<body>Redirecting...</body>
</html>`, { 
      headers: { 
        "content-type": "text/html",
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600"
      } 
    });

  } catch (err) {
    console.error("Stream Edge Function failed:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { 
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};

export const config: Config = { path: "/s/:id" };
