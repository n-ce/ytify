import { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";

/** Server-enforced warm-up delay before a session may be used. */
const SESSION_MIN_AGE_MS = 10000;
/** Sessions older than this are rejected and lazily swept. */
const SESSION_TTL_MS = 30 * 60 * 1000;
const SESSION_PREFIX = "session:";
const SOCIAL_BOT_PATTERN =
  /facebookexternalhit|twitterbot|whatsapp|telegrambot|discordbot|slackbot|linkedinbot/i;

/**
 * Hard cap on a single upstream call and therefore on how long any lease can be
 * held. The abort keeps "at most one call in flight per key" true even when the
 * upstream hangs, because the lease expires at exactly the same moment.
 */
const LEASE_TTL_MS = 10000;
/** The gate is a Cloudflare Worker round trip; never let it dominate latency. */
const GATE_TIMEOUT_MS = 3000;
const API_BASE = "https://api.ytify.workers.dev";
/** CDN lifetime for a rendered preview card. */
const PREVIEW_S_MAXAGE = 120;
const PREVIEW_STALE = 600;

interface SessionRecord {
  createdAt: number;
  ip: string;
}

interface CatalogPreview {
  title: string;
  author: string;
}

type LeaseResult =
  | { ok: true; mode: "gate"; keyIndex: number }
  | { ok: false; status: 429 | 403 | 503; retryAfterMs: number };

function getClientIp(request: Request, context: Context): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return (
    request.headers.get("x-nf-client-connection-ip") || context.ip || "unknown"
  );
}

function readSessionId(request: Request): string | null {
  const header = request.headers.get("x-session-id");
  if (header) return header;

  const query = new URL(request.url).searchParams.get("s");
  return query || null;
}

function apiBase(): string {
  return Netlify.env.get("api_base") || API_BASE;
}

/** Internal routes accept this when the deployment configures it. */
function internalHeaders(): Record<string, string> {
  const token = Netlify.env.get("internal_token");
  return token ? { "x-ytify-token": token } : {};
}

// ---------------------------------------------------------------------------
// Sessions
//
// Preferred mode is a stateless HMAC token: `<issuedAt>.<signature>` where the
// signature covers `issuedAt` and the client IP. That removes the Blobs round
// trip on every stream initiation and the blob pool an abuser could pre-warm,
// and it cannot go stale through eventual consistency because nothing is stored.
// Deployments without `session_secret` keep the Blobs-backed version.
// ---------------------------------------------------------------------------

function sessionSecret(): string | null {
  return Netlify.env.get("session_secret") || null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    // The explicit type parameter keeps the view assignable to BufferSource,
    // which the default Uint8Array<ArrayBufferLike> alias is not.
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    // Not base64 at all: a malformed token is simply invalid.
    return null;
  }
}

async function sessionKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  secret: string,
  issuedAt: number,
  ip: string,
): Promise<string> {
  const key = await sessionKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${issuedAt}:${ip}`),
  );
  return `${issuedAt}.${toBase64Url(new Uint8Array(sig))}`;
}

/**
 * Signed sessions are compared with `crypto.subtle.verify`, which is
 * constant-time. Splitting on ":" (as a `ts:ip:sig` layout would require) is
 * avoided deliberately: IPv6 addresses contain colons.
 */
export async function verifySignedSession(
  secret: string,
  token: string,
  ip: string,
  now: number = Date.now(),
): Promise<boolean> {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;

  const issuedAt = Number(token.slice(0, dot));
  if (!Number.isFinite(issuedAt)) return false;

  const age = now - issuedAt;
  if (age < SESSION_MIN_AGE_MS || age > SESSION_TTL_MS) return false;

  const key = await sessionKey(secret);
  const message = new TextEncoder().encode(`${issuedAt}:${ip}`);
  const provided = fromBase64Url(token.slice(dot + 1));
  if (!provided || provided.length !== 32) return false;
  // verify(algorithm, key, signature, data): the provided bytes are checked as a
  // MAC over the message, which is also what makes the comparison constant-time.
  return crypto.subtle.verify("HMAC", key, provided, message);
}

async function issueSession(ip: string): Promise<string> {
  const secret = sessionSecret();
  if (secret) {
    return signSession(secret, Date.now(), ip);
  }

  const sessionId = crypto.randomUUID();
  const store = getStore("rapidapi");
  const record: SessionRecord = { createdAt: Date.now(), ip };

  await store.setJSON(`${SESSION_PREFIX}${sessionId}`, record);

  return sessionId;
}

async function verifySession(request: Request, ip: string): Promise<boolean> {
  const sessionId = readSessionId(request);
  if (!sessionId) return false;

  const secret = sessionSecret();
  if (secret) {
    return verifySignedSession(secret, sessionId, ip);
  }

  const store = getStore("rapidapi");
  let record: SessionRecord | null = null;

  try {
    record = (await store.get(`${SESSION_PREFIX}${sessionId}`, {
      type: "json",
    })) as SessionRecord | null;
  } catch (e) {
    console.error("Session lookup failed:", e);
    return false;
  }

  if (!record || typeof record.createdAt !== "number") return false;

  const age = Date.now() - record.createdAt;
  if (age < SESSION_MIN_AGE_MS || age > SESSION_TTL_MS) return false;
  if (record.ip !== ip) return false;

  return true;
}

/** Only needed for the Blobs-backed fallback: stateless sessions cannot expire in storage. */
async function sweepExpiredSessions(): Promise<void> {
  if (sessionSecret()) return;

  const store = getStore("rapidapi");

  try {
    const { blobs } = await store.list({ prefix: SESSION_PREFIX });
    const cutoff = Date.now() - SESSION_TTL_MS;
    let swept = 0;

    for (const blob of blobs) {
      if (swept >= 10) break;

      const record = (await store.get(blob.key, {
        type: "json",
      })) as SessionRecord | null;
      if (
        !record ||
        typeof record.createdAt !== "number" ||
        record.createdAt < cutoff
      ) {
        await store.delete(blob.key);
        swept++;
      }
    }
  } catch (e) {
    console.error("Session sweep failed:", e);
  }
}

// ---------------------------------------------------------------------------
// Link previews (HTML): RapidAPI is unreachable from here by construction.
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Google's thumbnail CDN is free and needs no authentication. */
function thumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi_webp/${id}/mqdefault.webp`;
}

function previewHtml(id: string, preview: CatalogPreview | null): Response {
  const title = preview?.title || "ytify";
  const author = (preview?.author || "").replace(/ - Topic$/, "");
  const description = author ? `By ${author}` : "Listen on ytify";

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${thumbnailUrl(id)}">
  <meta property="og:type" content="website">
  <title>${escapeHtml(title)} | ytify</title>
  <script>location.replace('/?s=${encodeURIComponent(id)}')</script>
</head>
<body>Redirecting...</body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Crawlers refetch the same link for days, but a fresh link can be hit by
        // dozens of them at once, so the edge caches briefly and revalidates in
        // the background rather than every bot reaching this function.
        "Cache-Control": `public, s-maxage=${PREVIEW_S_MAXAGE}, stale-while-revalidate=${PREVIEW_STALE}`,
        Vary: "Accept",
      },
    },
  );
}

/** Tier 1: the shared global catalog, in <5ms and at zero upstream cost. */
async function readCatalogPreview(id: string): Promise<CatalogPreview | null> {
  try {
    const res = await fetch(
      `${apiBase()}/api/catalog/tracks?ids=${encodeURIComponent(id)}`,
      { headers: { Accept: "application/json", ...internalHeaders() } },
    );
    if (!res.ok) return null;

    const map = (await res.json()) as Record<
      string,
      { title?: string; author?: string }
    >;
    const track = map?.[id];
    if (!track?.title) return null;

    return { title: track.title, author: track.author || "" };
  } catch (e) {
    return null;
  }
}

/** Tier 2: YouTube's public oEmbed endpoint — free, unauthenticated, unmetered. */
async function readOEmbedPreview(id: string): Promise<CatalogPreview | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as { title?: string; author_name?: string };
    if (!data.title) return null;

    return { title: data.title, author: data.author_name || "" };
  } catch (e) {
    return null;
  }
}

/**
 * Write oEmbed results back into the catalog so the next preview for the same
 * track is a Tier 1 hit. Best-effort: a failure only costs the next preview a
 * single free oEmbed request.
 */
function writeThroughToCatalog(
  id: string,
  preview: CatalogPreview,
): Promise<void> {
  return fetch(`${apiBase()}/api/catalog/tracks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...internalHeaders(),
    },
    body: JSON.stringify({
      tracks: [
        {
          id,
          title: preview.title,
          author: preview.author,
          authorId: "",
          duration: 0,
          durationStr: "",
          isSong: true,
          thumbnailId: id,
          source: "oembed",
          updatedAt: Date.now(),
        },
      ],
    }),
  })
    .then(() => undefined)
    .catch((e) => console.warn("Catalog write-through failed:", e));
}

/**
 * Single-flight coalescing for cold lookups. When a link is shared in a busy
 * channel, dozens of crawlers arrive at once and all miss the catalog; without
 * this they would each fire their own oEmbed request and their own write-through.
 * Only the first caller per video id does the work, the rest await its result.
 */
const inflightPreviews = new Map<string, Promise<CatalogPreview | null>>();

function loadPreviewOnce(id: string): Promise<CatalogPreview | null> {
  const pending = inflightPreviews.get(id);
  if (pending) return pending;

  const lookup = readOEmbedPreview(id).finally(() => {
    inflightPreviews.delete(id);
  });
  inflightPreviews.set(id, lookup);
  return lookup;
}

async function handlePreview(id: string, context: Context): Promise<Response> {
  const cached = await readCatalogPreview(id);
  if (cached) return previewHtml(id, cached);

  const oembed = await loadPreviewOnce(id);
  if (oembed) {
    context.waitUntil(writeThroughToCatalog(id, oembed));
    return previewHtml(id, oembed);
  }

  // Both lookups failed (private/geo-blocked video): still return a valid card
  // so crawlers never get a bare redirect.
  return previewHtml(id, null);
}

// ---------------------------------------------------------------------------
// Stream gate: atomic single-writer lease + per-IP cooldown
// ---------------------------------------------------------------------------

type GateResponse = {
  granted: boolean;
  reason?: "leased" | "cooldown";
  retryAfterMs?: number;
  keyIndex?: number;
};

async function callGate(
  path: string,
  body: unknown,
): Promise<GateResponse | null> {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), GATE_TIMEOUT_MS);

  try {
    const res = await fetch(`${apiBase()}/api/stream-gate/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...internalHeaders() },
      body: JSON.stringify(body),
      signal: abort.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as GateResponse;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Asks the gate for permission to make exactly one upstream call.
 *
 * The gate is the only authority on concurrency, so an unreachable gate fails
 * closed. Isolate-local leases were tried and are useless here: Netlify runs
 * dozens of Deno isolates across its PoPs, so each one would hand out its own
 * lease under the exact conditions (jitter, cross-cloud latency, a flood aimed
 * at the worker) that make concurrency protection matter most.
 */
async function acquireLease(
  ip: string,
  sessionId: string,
  keyCount: number,
): Promise<LeaseResult> {
  const remote = await callGate("acquire", {
    key: sessionId,
    ip,
    ttlMs: LEASE_TTL_MS,
    keyCount,
  });

  if (!remote) {
    console.warn(
      `[GATE-UNREACHABLE] No lease for ${sessionId}; failing closed.`,
    );
    return { ok: false, status: 503, retryAfterMs: GATE_TIMEOUT_MS };
  }

  if (!remote.granted) {
    return {
      ok: false,
      status: remote.reason === "cooldown" ? 403 : 429,
      retryAfterMs: remote.retryAfterMs || LEASE_TTL_MS,
    };
  }

  return { ok: true, mode: "gate", keyIndex: remote.keyIndex || 0 };
}

function releaseLease(
  ip: string,
  sessionId: string,
  keyIndex: number,
  remaining: number,
  resetAt: number,
): Promise<void> {
  return callGate("release", {
    key: sessionId,
    ip,
    keyIndex,
    remaining,
    resetAt,
  }).then(() => undefined);
}

function cooldownResponse(): Response {
  return new Response(null, {
    status: 403,
    headers: {
      "Cache-Control": "public, s-maxage=86400",
      Vary: "x-forwarded-for",
    },
  });
}

function leaseConflictResponse(retryAfterMs: number): Response {
  return new Response(
    JSON.stringify({
      error: "A stream request is already in flight. Retry shortly.",
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
      },
    },
  );
}

function gateUnavailableResponse(retryAfterMs: number): Response {
  return new Response(
    JSON.stringify({
      error: "Stream gateway temporarily unavailable. Please retry.",
    }),
    {
      status: 503,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
      },
    },
  );
}

export default async (request: Request, context: Context) => {
  const { id } = context.params;
  const cgeo = context.geo?.country?.code || "IN";

  const accept = request.headers.get("accept") || "";
  const isJson = accept.includes("application/json");
  const clientIp = getClientIp(request, context);

  // GET /s/ - session creation. Unique-key writes only, so a burst of opens is
  // harmless: every caller gets its own unguessable ID and none of them is usable
  // until the server-enforced warm-up elapses.
  if (!id) {
    context.waitUntil(sweepExpiredSessions());

    try {
      const sessionId = await issueSession(clientIp);
      return new Response(JSON.stringify({ sessionId }), {
        headers: {
          "content-type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch (e) {
      console.error("Session issuance failed:", e);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }
  }

  if (id.length < 11) return new Response("Invalid ID", { status: 400 });

  const sessionId = readSessionId(request) || clientIp;

  // Content gating: an HTML request can never reach RapidAPI, so social bots and
  // preview scrapers cost zero quota. Browsers get the preview too, then redirect.
  if (!isJson) {
    const ua = request.headers.get("user-agent") || "";
    if (SOCIAL_BOT_PATTERN.test(ua)) {
      console.log(`[BOT-PREVIEW] ${ua} for ${id}`);
    }
    return handlePreview(id, context);
  }

  if (!(await verifySession(request, clientIp))) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired session" }),
      {
        status: 403,
        headers: {
          "content-type": "application/json",
          "Cache-Control": "no-store",
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
      headers: { "content-type": "application/json" },
    });
  }

  const lease = await acquireLease(clientIp, sessionId, allKeys.length);

  if (!lease.ok) {
    if (lease.status === 403) {
      console.warn(
        `[COOLDOWN] IP ${clientIp} requested within the cooldown window.`,
      );
      return cooldownResponse();
    }
    if (lease.status === 503)
      return gateUnavailableResponse(lease.retryAfterMs);

    console.warn(
      `[LEASE-CONFLICT] Key ${sessionId} already has a call in flight.`,
    );
    return leaseConflictResponse(lease.retryAfterMs);
  }

  const upstreamAbort = new AbortController();
  const upstreamTimeout = setTimeout(() => upstreamAbort.abort(), LEASE_TTL_MS);

  try {
    const maxAttempts = Math.min(allKeys.length, 3);
    let lastError: Error | null = null;
    let successResponse: Response | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const keyIdx = (lease.keyIndex + attempt) % allKeys.length;
      const currentKey = allKeys[keyIdx];

      try {
        const res = await fetch(
          `https://yt-api.p.rapidapi.com/dl?id=${id}&cgeo=${cgeo}`,
          {
            headers: {
              "X-RapidAPI-Key": currentKey,
              "X-RapidAPI-Host": "yt-api.p.rapidapi.com",
            },
            signal: upstreamAbort.signal,
          },
        );

        const remainingHeader = res.headers.get(
          "x-ratelimit-requests-remaining",
        );
        const resetHeader = res.headers.get("x-ratelimit-requests-reset");
        const remaining =
          remainingHeader !== null
            ? parseInt(remainingHeader, 10)
            : res.ok
              ? 500
              : 0;
        const resetSec = resetHeader !== null ? parseInt(resetHeader, 10) : 0;

        // Release lease telemetry for this key
        void releaseLease(
          clientIp,
          sessionId,
          keyIdx,
          remaining,
          Date.now() + resetSec * 1000,
        ).catch((e) => console.error("Lease release failed:", e));

        if (res.status === 403 || res.status === 429) {
          console.warn(
            `[RAPIDAPI QUOTA] Key Index ${keyIdx} returned ${res.status}. Rotating key if available...`,
          );
          lastError = new Error(`RapidAPI HTTP Error: ${res.status}`);
          continue;
        }

        if (!res.ok) {
          throw new Error(`RapidAPI HTTP Error: ${res.status}`);
        }

        const rawResponseText = await res.text();
        let data: any;
        try {
          data = JSON.parse(rawResponseText);
        } catch {
          throw new Error(
            "Received malformed JSON data payload from source API.",
          );
        }

        if (!data || !data.adaptiveFormats) {
          console.error(`[VALIDATION ERROR] Missing payload properties.`);
        }

        const expireSeconds = parseInt(data?.expiresInSeconds || "21600");

        successResponse = new Response(
          JSON.stringify({
            title: data?.title || "Unknown Title",
            author: data?.channelTitle || "Unknown Author",
            authorId: data?.authorId || data?.channelId || "",
            lengthSeconds: parseInt(data?.lengthSeconds || "0"),
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
        break;
      } catch (e: any) {
        lastError = e;
        if (
          e?.message?.includes("RapidAPI HTTP Error: 403") ||
          e?.message?.includes("RapidAPI HTTP Error: 429")
        ) {
          continue;
        }
        break;
      }
    }

    if (successResponse) {
      return successResponse;
    }

    throw lastError || new Error("Stream resolution failed");
  } catch (err) {
    console.error("Stream Edge Function failed:", err);
    let msg = err instanceof Error ? err.message : "Stream resolution failed";
    // Never leak key material externally
    for (const k of allKeys) {
      if (k && msg.includes(k)) msg = msg.replaceAll(k, "[REDACTED]");
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  } finally {
    clearTimeout(upstreamTimeout);
  }
};

export const config: Config = { path: ["/s/:id", "/s/"] };
