import { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";

interface IPRecord {
  lastSeen: number;
  totalViolations: number;
}

interface RapidAPIState {
  keys: Array<{
    remaining: number;
    resetsat: number;
  }>;
  ips: Record<string, IPRecord>;
}

// 🛡️ The Heavy Offender Wall - Kicked out before any database or API interaction
const HARD_BANNED_SUBNETS = [
  "5.188.124.9", // 429
  "27.121.6.",
  "27.121.41.",
  "38.133.204.210", // 153
  "40.140.0.170", // 117
  "41.224.2.11",
  "45.4.36.18", // 993
  "50.86.10.234",
  "74.62.90.194", // 505
  "103.161.250.10",
  "105.114.36.194", // 258
  "105.114.38.194", // 1,130
  "117.199.197.6",
  "124.6.140.178",
  "136.226.122.193", // 129
  "159.18.195.32",
  "162.158.179.",
  "162.159.98.",
  "163.116.174.",
  "165.225.223.6", // 426
  "170.80.97.251",
  "172.68.211.",
  "172.68.225.",
  "172.71.215.",
  "173.235.97.34",
  "184.174.140.",
  "190.107.19.",
  "190.217.64.",
  "192.234.90.59", // 151
  "199.27.134.241", // 1,267
  "203.28.67.",
  "204.111.27.124", // 235
  "204.153.8.1", // 246
  "206.19.231.4", // 204
  "210.14.11.",
  "212.175.130.20",
];

// Issue #5: Exact match for /32 single IPs, prefix match for subnets ending in '.'
function isIpBanned(clientIp: string): boolean {
  return HARD_BANNED_SUBNETS.some((rule) =>
    rule.endsWith(".") ? clientIp.startsWith(rule) : clientIp === rule,
  );
}

// Issue #1: Prefer trusted edge connection IP over spoofable x-forwarded-for
function getClientIp(request: Request, context: Context): string {
  const directIp =
    request.headers.get("x-nf-client-connection-ip") || context.ip;
  if (directIp) return directIp;
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return "unknown";
}

// Issue #6: Guarantee persistence of decayed state using context.waitUntil or await
async function getRapidAPIState(
  context?: Context,
): Promise<RapidAPIState | null> {
  const store = getStore("rapidapi");
  try {
    const state = (await store.get("data", {
      type: "json",
    })) as RapidAPIState | null;

    if (state?.ips) {
      let stateModified = false;
      const now = Date.now();
      const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
      const ipKeys = Object.keys(state.ips);

      for (const ip of ipKeys) {
        const record = state.ips[ip];
        if (!record || typeof record !== "object") continue;
        const timePassed = now - record.lastSeen;
        const periodsPassed = Math.floor(timePassed / SIX_HOURS_MS);

        if (periodsPassed > 0) {
          const newViolations = Math.max(
            0,
            record.totalViolations - periodsPassed,
          );

          if (newViolations === 0) {
            delete state.ips[ip];
            stateModified = true;
          } else if (newViolations !== record.totalViolations) {
            state.ips[ip].totalViolations = newViolations;
            // Advance lastSeen by the exact number of 6-hour blocks processed to keep remainder intact
            state.ips[ip].lastSeen =
              record.lastSeen + periodsPassed * SIX_HOURS_MS;
            stateModified = true;
          }
        }
      }

      if (stateModified) {
        const writePromise = store
          .setJSON("data", state)
          .catch((e) => console.error("Failed to persist decayed state:", e));
        if (context?.waitUntil) {
          context.waitUntil(writePromise);
        } else {
          await writePromise;
        }
      }
    }

    return state;
  } catch (e) {
    return null;
  }
}

// Issue #2 & #4: Consult state, handle rate-limit exhaustion, avoid false resets to 500
function selectBestKey(
  state: RapidAPIState | null,
  allKeys: string[],
): { key: string; index: number } {
  const now = Date.now();

  const available = allKeys.map((k, idx) => {
    const entry = state?.keys[idx];
    if (!entry) return { key: k, index: idx, remaining: 500, resetsat: 0 };

    // If key had a positive reset time in the past, its reset window elapsed: restore quota
    if (entry.resetsat > 0 && now > entry.resetsat) {
      return { key: k, index: idx, remaining: 500, resetsat: 0 };
    }

    return {
      key: k,
      index: idx,
      remaining: entry.remaining ?? 500,
      resetsat: entry.resetsat ?? 0,
    };
  });

  // Prioritize unblocked keys with quota, followed by earliest resetsat
  available.sort((a, b) => {
    const aBlocked = a.resetsat > now || a.remaining <= 0;
    const bBlocked = b.resetsat > now || b.remaining <= 0;
    if (aBlocked !== bBlocked) {
      return aBlocked ? 1 : -1;
    }
    return b.remaining - a.remaining || a.resetsat - b.resetsat;
  });

  return { key: available[0].key, index: available[0].index };
}

// Issue #2, #3, #4: Safe quota tracking and preservation
async function updateRapidAPIState(
  index: number,
  remaining: number | null,
  resetsat: number | null,
  ip: string,
  context?: Context,
) {
  const store = getStore("rapidapi");
  const state = (await getRapidAPIState(context)) || { keys: [], ips: {} };

  while (state.keys.length <= index) {
    state.keys.push({ remaining: 500, resetsat: 0 });
  }

  const currentEntry = state.keys[index] || { remaining: 500, resetsat: 0 };
  state.keys[index] = {
    remaining: remaining !== null ? remaining : currentEntry.remaining,
    resetsat: resetsat !== null ? resetsat : currentEntry.resetsat,
  };

  // Clean request: Safely resolve historical totals if transitioning schema
  const existingRecord = state.ips[ip];
  const historicalViolations =
    existingRecord && typeof existingRecord === "object"
      ? existingRecord.totalViolations
      : 0;

  state.ips[ip] = {
    lastSeen: Date.now(),
    totalViolations: historicalViolations,
  };

  try {
    const writePromise = store.setJSON("data", state);
    if (context?.waitUntil) {
      context.waitUntil(writePromise);
    } else {
      await writePromise;
    }
  } catch (e) {
    console.error("Failed to update RapidAPI state:", e);
  }
}

export default async (request: Request, context: Context) => {
  const { prefix, slug } = context.params;

  // Pass through any reserved SPA routes or non-split requests to the SPA
  const RESERVED_ROUTES = [
    "album",
    "artist",
    "channel",
    "playlist",
    "api",
    "assets",
    "s", // Pass legacy /s/:id straight to SPA - no RapidAPI fallback for /s/
  ];

  if (!prefix || !slug || RESERVED_ROUTES.includes(prefix)) {
    return context.next();
  }

  // Enforce strict split YouTube ID format:
  // prefix = first char of ID (1 char)
  // slug = remaining 10 chars of ID (10 chars)
  if (prefix.length !== 1 || slug.length !== 10) {
    return context.next();
  }

  const id = prefix + slug;

  const cgeo = context.geo?.country?.code || "IN";
  const accept = request.headers.get("accept") || "";
  const isJson = accept.includes("application/json");

  const clientIp = getClientIp(request, context);

  // Fast gateway firewall drop (Issue #5)
  if (isIpBanned(clientIp)) {
    console.warn(`[FAST-DROP] Blocked heavy abuser ${clientIp} at the gate.`);
    return new Response(
      "Fast Gateway Firewall Drop | You have been restricted from access to the ytify fallback service.",
      {
        status: 403,
        headers: {
          "Cache-Control": "public, s-maxage=86400",
          Vary: "x-forwarded-for, x-nf-client-connection-ip",
        },
      },
    );
  }

  const rawKeys = Netlify.env.get("rkeys") || "";
  const allKeys = rawKeys
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (!allKeys.length) {
    return new Response(JSON.stringify({ error: "No API keys configured" }), {
      status: 500,
    });
  }

  const state = await getRapidAPIState(context);
  const now = Date.now();
  const BASE_COOLDOWN = 20000;

  // Rate-limiting check with structure validation
  if (state && state.ips[clientIp]) {
    const record = state.ips[clientIp];
    const lastSeenTime =
      record && typeof record === "object"
        ? record.lastSeen
        : Number(record || 0);
    const timePassed = now - lastSeenTime;

    if (timePassed <= BASE_COOLDOWN) {
      if (!state.ips[clientIp] || typeof state.ips[clientIp] !== "object") {
        state.ips[clientIp] = { lastSeen: now, totalViolations: 0 };
      }

      state.ips[clientIp].totalViolations += 1;
      state.ips[clientIp].lastSeen = now;

      // Issue #7: Debounce writes on repeat violation floods (at most once every 5 seconds per IP)
      if (timePassed > 5000) {
        const store = getStore("rapidapi");
        const writePromise = store
          .setJSON("data", state)
          .catch((e) => console.error("Failed to persist violation state:", e));
        if (context.waitUntil) {
          context.waitUntil(writePromise);
        } else {
          await writePromise;
        }
      }

      console.warn(
        `[VIOLATION] IP ${clientIp} requested early (${timePassed}ms <= ${BASE_COOLDOWN}ms). Total: ${state.ips[clientIp].totalViolations}. Returning cached empty 403.`,
      );

      return new Response(null, {
        status: 403,
        headers: {
          "Cache-Control": "public, s-maxage=86400",
          Vary: "x-forwarded-for, x-nf-client-connection-ip",
        },
      });
    }
  }

  // Issue #4: Select best key based on state for both JSON and non-JSON paths
  const { key: selectedKey, index: selectedIndex } = selectBestKey(
    state,
    allKeys,
  );

  try {
    const res = await fetch(
      `https://yt-api.p.rapidapi.com/dl?id=${id}&cgeo=${cgeo}`,
      {
        headers: {
          "X-RapidAPI-Key": selectedKey,
          "X-RapidAPI-Host": "yt-api.p.rapidapi.com",
        },
      },
    );

    // Issue #3: Parse remaining and reset headers with proper guards
    const rawRemaining = res.headers.get("x-ratelimit-requests-remaining");
    const rawReset = res.headers.get("x-ratelimit-requests-reset");

    const remainingParsed =
      rawRemaining !== null ? parseInt(rawRemaining, 10) : null;
    const resetSecParsed = rawReset !== null ? parseInt(rawReset, 10) : null;

    // Issue #2: Fallback cooldown if resetSec <= 0 on rate limit
    const fallbackCooldownMs = 60 * 1000;
    const resetTimestamp =
      resetSecParsed !== null && resetSecParsed > 0
        ? Date.now() + resetSecParsed * 1000
        : res.status === 429
          ? Date.now() + fallbackCooldownMs
          : null;

    // Issue #8: Handle upstream processing (102) and timeouts (504) as retryable responses
    if (res.status === 102 || res.status === 504) {
      console.warn(
        `[RAPIDAPI RETRYABLE] Status ${res.status} for ID ${id}. Upstream extraction in progress/timeout.`,
      );
      return new Response(
        JSON.stringify({
          error: "Upstream source timeout - extraction in progress",
          retryable: true,
        }),
        {
          status: 504,
          headers: {
            "content-type": "application/json",
            "Retry-After": "3",
          },
        },
      );
    }

    const rawResponseText = await res.text();

    if (!res.ok) {
      console.error(
        `[RAPIDAPI ERROR] Key Index: ${selectedIndex}, Status: ${res.status}. Raw Payload: ${rawResponseText}`,
      );

      // On 429, mark remaining as 0; on other non-ok codes, preserve quota if header missing
      const remainingToStore =
        res.status === 429
          ? 0
          : remainingParsed !== null && !isNaN(remainingParsed)
            ? remainingParsed
            : null;

      await updateRapidAPIState(
        selectedIndex,
        remainingToStore,
        resetTimestamp,
        clientIp,
        context,
      );

      throw new Error(`RapidAPI HTTP Error: ${res.status}`);
    }

    // Success: Record quota updates for both JSON and non-JSON paths (Issue #4)
    await updateRapidAPIState(
      selectedIndex,
      remainingParsed !== null && !isNaN(remainingParsed)
        ? remainingParsed
        : null,
      resetTimestamp,
      clientIp,
      context,
    );

    let data: any;
    try {
      data = JSON.parse(rawResponseText);
    } catch (e) {
      console.error(
        `[PARSE ERROR] Invalid JSON payload from RapidAPI: ${rawResponseText}`,
      );
      throw new Error("Received malformed JSON data payload from source API.");
    }

    if (!data || !data.adaptiveFormats) {
      console.error(
        `[VALIDATION ERROR] Missing payload properties. Raw Output: ${rawResponseText}`,
      );
    }

    const expireSeconds = parseInt(data?.expiresInSeconds || "21600", 10);

    if (isJson) {
      return new Response(
        JSON.stringify({
          title: data?.title || "Unknown Title",
          author: data?.channelTitle || "Unknown Author",
          authorId: data?.authorId || data?.channelId || "",
          lengthSeconds: parseInt(data?.lengthSeconds || "0", 10),
          adaptiveFormats: data?.adaptiveFormats
            ? data.adaptiveFormats.map((f: any) => ({
                ...f,
                type: f.mimeType,
                bitrate: f.bitrate?.toString() || "",
                clen: f.contentLength,
                url: f.url + "&fallback",
              }))
            : [],
          recommendedVideos: [],
          captions: [],
          liveNow: data?.isLiveContent || false,
        }),
        {
          headers: {
            "content-type": "application/json",
            "Cache-Control": `public, s-maxage=${expireSeconds}`,
            Vary: "Accept, x-nf-country",
          },
        },
      );
    }

    const music = data.channelTitle?.endsWith(" - Topic")
      ? "https://wsrv.nl?w=180&h=180&fit=cover&url="
      : "";
    const thumbnail = `${music}https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`;

    return new Response(
      `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description" content="${data.title || ""} by ${(data.channelTitle || "").replace(" - Topic", "")} in ytify">
  <meta property="og:title" content="${data.title || ""}">
  <meta property="og:description" content="By ${(data.channelTitle || "").replace(" - Topic", "")}">
  <meta property="og:image" content="${thumbnail}">
  <meta property="og:type" content="website">
  <title>${data.title || "Playback"} | ytify</title>
  <script>location.replace('/?s=${id}')</script>
</head>
<body>Redirecting...</body>
</html>`,
      {
        headers: {
          "content-type": "text/html",
          "Cache-Control": "public, s-maxage=604800",
          Vary: "Accept",
        },
      },
    );
  } catch (err) {
    console.error("Stream Edge Function failed:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/:prefix/:slug",
};
