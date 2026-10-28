import getAlbum from "./getAlbum.js";
import getArtist from "./getArtist.js";
import getChannel from "./getChannel.js";
import getFeatured from "./getFeatured.js";
import getPlaylist from "./getPlaylist.js";
import getSearch from "./getSearch.js";
import getSearchSuggestions from "./getSearchSuggestions.js";
import getSimilar from "./getSimilar.js";
import getSubFeed from "./getSubFeed.js";
import { handleFixMetadata, type FixTarget } from "./fixMetadata.js";
import type {
  DurableObjectNamespace,
  ExecutionContext,
} from "@cloudflare/workers-types";

export { UserSyncDO } from "./UserSyncDO.ts";

export interface Env {
  USER_SYNC_DO?: DurableObjectNamespace;
  INTERNAL_TOKEN?: string;
}

const ALLOWED_ORIGINS = [
  "https://ytify.pp.ua",
  "https://ytify.netlify.app",
  "https://ytify.zeabur.app",
  "https://ytify-zeta.vercel.app",
  "https://ytify-legacy.vercel.app",
  "https://ytify-2nx7.onrender.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

function getEdgeCache(): Cache | null {
  try {
    return typeof caches !== "undefined" && (caches as any).default
      ? (caches as any).default
      : null;
  } catch {
    return null;
  }
}

function jsonCachedResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  cacheControl: string,
  request?: Request,
  ctx?: ExecutionContext,
): Response {
  const response = new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": cacheControl,
    },
  });

  const edgeCache = getEdgeCache();
  if (edgeCache && request && ctx?.waitUntil && request.method === "GET") {
    ctx.waitUntil(edgeCache.put(request, response.clone()));
  }
  return response;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowedOrigin =
      origin && ALLOWED_ORIGINS.includes(origin)
        ? origin
        : "https://ytify.pp.ua";

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-ytify-token",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const path = url.pathname.replace(/^\/+/, "");
    const searchParams = url.searchParams;

    // Edge cache lookup for public GET queries
    const edgeCache = getEdgeCache();
    if (
      edgeCache &&
      request.method === "GET" &&
      !path.startsWith("sync") &&
      !path.startsWith("library") &&
      path !== "syncHash" &&
      path !== "hash"
    ) {
      try {
        const cached = await edgeCache.match(request);
        if (cached) {
          const headers = new Headers(cached.headers);
          headers.set("Access-Control-Allow-Origin", allowedOrigin);
          headers.set("CF-Cache-Status", "HIT");
          return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers,
          });
        }
      } catch (err) {
        console.warn("[edge-cache] match failed:", err);
      }
    }

    // --- Sync Hash Route (Stateless SHA-256) ---
    if (path === "syncHash" || path === "hash") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      const body = (await request.json().catch(() => ({}))) as {
        email?: string;
        password?: string;
      };

      const { email, password } = body;
      if (!email || !password) {
        return new Response("Missing email or password", {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      const trimmedEmail = typeof email === "string" ? email.trim() : "";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return new Response("Email is not valid", {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      // Optional external deliverability check. Fail-open: only an explicit
      // INVALID verdict rejects, so outages/timeouts never block a login.
      const validatorUrl = `https://rapid-email-verifier.fly.dev/api/validate?email=${encodeURIComponent(trimmedEmail)}`;
      const validatorAbort = new AbortController();
      const validatorTimeout = setTimeout(() => validatorAbort.abort(), 3000);
      try {
        const emailResponse = await fetch(validatorUrl, {
          signal: validatorAbort.signal,
        });
        if (emailResponse.ok) {
          const emailData = (await emailResponse.json()) as {
            status?: string;
          };
          if (emailData.status === "INVALID") {
            return new Response("Email is not valid", {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "text/plain" },
            });
          }
        }
      } catch (error) {
        console.warn(
          "Optional email validator check skipped/timed out:",
          error,
        );
      } finally {
        clearTimeout(validatorTimeout);
      }

      const normalizedEmail = trimmedEmail.toLowerCase();
      const combinedString = `${normalizedEmail}|${password}`;
      const msgBuffer = new TextEncoder().encode(combinedString);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashedPassword = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      return new Response(hashedPassword, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // --- Durable Object Sync & Library Routes ---
    const syncMatch = path.match(
      /^(sync|library)\/([a-fA-F0-9]{64}|[a-zA-Z0-9_-]+)/,
    );
    if (syncMatch) {
      if (!env.USER_SYNC_DO) {
        return new Response(
          JSON.stringify({ error: "USER_SYNC_DO binding not configured." }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const userHash = syncMatch[2];
      const doId = env.USER_SYNC_DO.idFromName(userHash);
      const stub = env.USER_SYNC_DO.get(doId);

      try {
        const doResponse = (await stub.fetch(request as any)) as any;
        const responseHeaders = new Headers(doResponse.headers);
        for (const [key, value] of Object.entries(corsHeaders)) {
          responseHeaders.set(key, value);
        }

        return new Response(doResponse.body, {
          status: doResponse.status,
          headers: responseHeaders,
        });
      } catch (err: any) {
        console.error("[userSync] DO fetch failed:", err);
        const errMsg = err?.message || "Sync service error";
        const isQuota =
          errMsg.toLowerCase().includes("quota") ||
          errMsg.toLowerCase().includes("limit");
        return new Response(
          JSON.stringify({
            error: isQuota
              ? "Sync storage quota reached"
              : "Sync service temporarily unavailable",
            details: errMsg,
          }),
          {
            status: isQuota ? 429 : 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // --- Retired Catalog Route Guard ---
    if (path.startsWith("catalog")) {
      return new Response(
        JSON.stringify({
          error: "Catalog Durable Object is retired for future plans.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- Featured endpoint (artist "Featured on" shelf) ---
    if (path === "featured") {
      const artistIds = (searchParams.get("artistIds") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const limit = Math.min(
        parseInt(searchParams.get("limit") || "20", 10) || 20,
        30,
      );
      const result = await getFeatured(artistIds, limit);
      return jsonCachedResponse(
        result,
        corsHeaders,
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=1800",
        request,
        ctx,
      );
    }

    try {
      let data: unknown;

      switch (path) {
        case "album": {
          const id = searchParams.get("id");
          if (!id) throw new Error("Missing id parameter");
          data = await getAlbum(id);
          break;
        }
        case "artist": {
          const id = searchParams.get("id");
          if (!id) throw new Error("Missing id parameter");
          data = await getArtist(id);
          break;
        }
        case "channel": {
          const id = searchParams.get("id");
          if (!id) throw new Error("Missing id parameter");
          data = await getChannel(id);
          break;
        }
        case "fix-metadata": {
          let targets: FixTarget[] = [];
          if (request.method === "POST") {
            const body = (await request.json().catch(() => ({}))) as {
              tracks?: FixTarget[];
              id?: string;
              title?: string;
              author?: string;
              isTopic?: boolean;
            };
            if (Array.isArray(body.tracks)) {
              targets = body.tracks.filter((t) => t && (t.id || t.title));
            } else if (body.id) {
              targets = [
                {
                  id: body.id,
                  title: body.title || "",
                  author: body.author,
                  isTopic: body.isTopic,
                },
              ];
            }
          } else {
            const id = searchParams.get("id");
            const title = searchParams.get("title") || "";
            const author = searchParams.get("author") || "";
            const isTopic = searchParams.get("isTopic") === "true";
            if (id) targets = [{ id, title, author, isTopic }];
          }

          if (targets.length === 0) {
            return new Response(
              JSON.stringify({ error: "Missing tracks or id parameter" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          data = await handleFixMetadata(targets);
          break;
        }
        case "playlist": {
          const id = searchParams.get("id");
          const all = searchParams.get("all") === "true";
          if (!id) throw new Error("Missing id parameter");
          data = await getPlaylist(id, all);
          break;
        }
        case "search": {
          const q = searchParams.get("q");
          const f = searchParams.get("f");
          if (!q) throw new Error("Missing q parameter");
          data = await getSearch({ q, f: f || undefined });
          break;
        }
        case "search-suggestions": {
          const q = searchParams.get("q");
          const music = searchParams.get("music") === "true";
          if (!q) throw new Error("Missing q parameter");
          data = await getSearchSuggestions({ q, music });
          break;
        }
        case "similar": {
          const title = searchParams.get("title");
          const artist = searchParams.get("artist");
          const limit = searchParams.get("limit");
          if (!title || !artist)
            throw new Error("Missing title or artist parameter");
          data = await getSimilar({ title, artist, limit: limit || undefined });
          break;
        }
        case "subfeed": {
          const id = searchParams.get("id");
          if (!id) throw new Error("Missing id parameter");
          data = await getSubFeed(id.split(","));
          break;
        }
        default:
          return new Response(JSON.stringify({ error: "Not Found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control":
            path === "search" || path === "search-suggestions"
              ? "public, max-age=3600, s-maxage=3600, stale-while-revalidate=1800"
              : "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
        },
      });
    } catch (error: any) {
      console.error(`Error processing path ${path}:`, error);
      return new Response(
        JSON.stringify({
          error: error.message || "Internal Server Error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  },
};
