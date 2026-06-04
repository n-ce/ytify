import { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";

interface RapidAPIState {
  keys: Array<{
    remaining: number;
    resetsat: number;
  }>;
  ips: Record<string, number>;
}

function getClientIp(request: Request, context: Context): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-nf-client-connection-ip") || context.ip || "unknown";
}

async function getRapidAPIState() {
  const store = getStore("rapidapi");
  try {
    return (await store.get("coolstate", { type: "json" })) as RapidAPIState | null;
  } catch (e) {
    return null;
  }
}

function selectBestKey(state: RapidAPIState | null, allKeys: string[]): { key: string; index: number } {
  const now = Date.now();

  const available = allKeys.map((k, idx) => {
    const entry = state?.keys[idx];
    if (!entry) return { key: k, index: idx, remaining: 500, resetsat: 0 };
    if (now > entry.resetsat) return { key: k, index: idx, remaining: 500, resetsat: 0 };
    return { key: k, index: idx, remaining: entry.remaining, resetsat: entry.resetsat };
  });

  available.sort((a, b) => b.remaining - a.remaining || a.resetsat - b.resetsat);
  return { key: available[0].key, index: available[0].index };
}

async function updateRapidAPIState(index: number, remaining: number, resetsat: number, ip: string) {
  const store = getStore("rapidapi");
  const state = (await getRapidAPIState()) || { keys: [], ips: {} };

  while (state.keys.length <= index) {
    state.keys.push({ remaining: 500, resetsat: 0 });
  }

  state.keys[index] = { remaining, resetsat };
  state.ips[ip] = Date.now();

  try {
    await store.setJSON("coolstate", state);
  } catch (e) {
    console.error("Failed to update RapidAPI state:", e);
  }
}

export default async (request: Request, context: Context) => {
  const { id } = context.params;
  if (!id || id.length < 11) return new Response("Invalid ID", { status: 400 });

  const accept = request.headers.get("accept") || "";
  const isJson = accept.includes("application/json");

  const clientIp = getClientIp(request, context);

  const rawKeys = Netlify.env.get("rkeys") || "";
  const allKeys = rawKeys.split(",").map(k => k.trim()).filter(Boolean);

  if (!allKeys.length) {
    return new Response(JSON.stringify({ error: "No API keys configured" }), { status: 500 });
  }

  let selectedKey = "";
  let selectedIndex = 0;
  let state: RapidAPIState | null = null;

  if (isJson) {
    state = await getRapidAPIState();

    // ⚡ Elastic 1-Minute Cooldown Penalty Filter (Entropy Honeypot Mode)
    if (state && state.ips[clientIp]) {
      const lastRequestAt = state.ips[clientIp];
      const BASE_COOLDOWN = 60000;
      const timePassed = Date.now() - lastRequestAt;

      if (timePassed <= BASE_COOLDOWN) {
        const timeEarly = BASE_COOLDOWN - timePassed;

        const store = getStore("rapidapi");
        state.ips[clientIp] = Date.now() + timeEarly;
        await store.setJSON("coolstate", state);

        console.warn(`[VIOLATION] Sinking IP ${clientIp} into the 50MB random chunk loop. Deficit: ${(timeEarly / 1000).toFixed(1)}s.`);

        // 🌊 Dynamic memory-safe lazy-loading noise pipe response
        let chunksSent = 0;
        const chunkSize = 64 * 1024; // 64KB chunks
        const chunk = new Uint8Array(chunkSize);
        const totalChunks = Math.ceil((50 * 1024 * 1024) / chunkSize); // Target: ~50MB

        const stream = new ReadableStream({
          async pull(controller) {
            if (chunksSent >= totalChunks) {
              controller.close();
              return;
            }
            crypto.getRandomValues(chunk);
            controller.enqueue(new Uint8Array(chunk));
            chunksSent++;
          }
        });

        return new Response(stream, {
          headers: { 'content-type': 'application/octet-stream' }
        });
      }
    }

    const selection = selectBestKey(state, allKeys);
    selectedKey = selection.key;
    selectedIndex = selection.index;
  } else {
    selectedIndex = Math.floor(Math.random() * allKeys.length);
    selectedKey = allKeys[selectedIndex];
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
      await updateRapidAPIState(selectedIndex, remaining, Date.now() + resetSec * 1000, clientIp);
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
