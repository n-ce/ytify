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
import {
  type Env,
  readCategories,
  readPlaylists,
  readTracks,
  upsertCategories,
  upsertPlaylists,
  upsertTracks,
} from "./catalogClient.js";
import {
  type Category,
  type CuratedPlaylist,
  type CanonicalTrack,
  tracksToCanonical,
} from "./catalog.js";
import type { ExecutionContext } from "@cloudflare/workers-types";

export { UserSyncDO } from "./UserSyncDO.ts";
export { CatalogDO } from "./CatalogDO.js";
export type { Env };

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

const MAX_CATALOG_IDS = 100;

function getEdgeCache(): Cache | null {
  try {
    return typeof caches !== "undefined" && (caches as any).default
      ? (caches as any).default
      : null;
  } catch {
    return null;
  }
}

/**
 * Internal routes (catalog writes) are only meant for the
 * ytify edge functions. When INTERNAL_TOKEN is configured the caller must
 * present it; unconfigured deployments stay open so local dev and self-hosting
 * need no extra setup.
 */
function isInternalCaller(request: Request, env: Env): boolean {
  if (!env.INTERNAL_TOKEN) return true;
  return request.headers.get("x-ytify-token") === env.INTERNAL_TOKEN;
}

function unauthorized(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  cacheControl?: string,
): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(cacheControl ? { "Cache-Control": cacheControl } : {}),
    },
  });
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, If-Match",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const path = url.pathname.replace(/^\/api\//, "").replace(/^\//, "");
    const searchParams = url.searchParams;

    // --- Edge Cache Verification for Read-Only Catalog Routes ---
    const edgeCache = getEdgeCache();
    if (
      edgeCache &&
      request.method === "GET" &&
      (path.startsWith("catalog/") || path === "featured")
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

      const doResponse = (await stub.fetch(request as any)) as any;
      const responseHeaders = new Headers(doResponse.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        responseHeaders.set(key, value);
      }

      return new Response(doResponse.body, {
        status: doResponse.status,
        headers: responseHeaders,
      });
    }

    // --- Global Normalized Catalog ---
    if (path.startsWith("catalog")) {
      if (!env.CATALOG_DO) {
        return new Response(
          JSON.stringify({ error: "CATALOG_DO binding not configured." }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (path.startsWith("catalog/tracks")) {
        if (request.method === "GET") {
          // Bounded so a caller cannot build an unbounded IN clause in the DO.
          const ids = (searchParams.get("ids") || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, MAX_CATALOG_IDS);
          const tracks = await readTracks(env, ids);
          return jsonCachedResponse(
            tracks,
            corsHeaders,
            "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
            request,
            ctx,
          );
        }
        if (request.method === "POST") {
          if (!isInternalCaller(request, env)) return unauthorized(corsHeaders);
          const body = (await request.json().catch(() => null)) as {
            tracks?: CanonicalTrack[];
          } | null;
          if (!Array.isArray(body?.tracks)) {
            return new Response(JSON.stringify({ error: "Missing tracks" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          await upsertTracks(
            env,
            body.tracks.filter((t) => t && t.id),
          );
          return jsonResponse({ ok: true }, corsHeaders);
        }
      }

      if (path.startsWith("catalog/categories")) {
        if (request.method === "GET") {
          const categories = await readCategories(
            env,
            searchParams.get("type"),
          );
          return jsonCachedResponse(
            categories,
            corsHeaders,
            "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
            request,
            ctx,
          );
        }
        if (request.method === "POST") {
          if (!isInternalCaller(request, env)) return unauthorized(corsHeaders);
          const body = (await request.json().catch(() => null)) as {
            categories?: Category[];
          } | null;
          if (!Array.isArray(body?.categories)) {
            return new Response(
              JSON.stringify({ error: "Missing categories" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
          await upsertCategories(
            env,
            body.categories.filter((c) => c && c.slug && c.title),
          );
          return jsonResponse({ ok: true }, corsHeaders);
        }
      }

      if (path.startsWith("catalog/playlists")) {
        if (request.method === "GET") {
          const playlists = await readPlaylists(
            env,
            searchParams.get("category"),
          );
          return jsonCachedResponse(
            playlists,
            corsHeaders,
            "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
            request,
            ctx,
          );
        }
        if (request.method === "POST") {
          if (!isInternalCaller(request, env)) return unauthorized(corsHeaders);
          const body = (await request.json().catch(() => null)) as {
            playlists?: CuratedPlaylist[];
          } | null;
          if (!Array.isArray(body?.playlists)) {
            return new Response(
              JSON.stringify({ error: "Missing playlists" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
          await upsertPlaylists(
            env,
            body.playlists.filter((p) => p && p.id && p.title),
          );
          return jsonResponse({ ok: true }, corsHeaders);
        }
      }
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
      const result = await getFeatured(env, artistIds, limit);
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
          if (env.CATALOG_DO && Array.isArray((data as any)?.items)) {
            const albumTitle = (data as any).name || (data as any).title;
            const albumTracks = (data as any).items.map((item: any) => ({
              ...item,
              albumId: id,
              albumTitle: albumTitle || item.albumTitle,
            }));
            const canonical = tracksToCanonical(albumTracks, "artist_featured");
            if (ctx?.waitUntil && canonical.length > 0) {
              ctx.waitUntil(upsertTracks(env, canonical));
            }
          }
          break;
        }
        case "artist": {
          const id = searchParams.get("id");
          if (!id) throw new Error("Missing id parameter");
          data = await getArtist(id);
          if (env.CATALOG_DO && Array.isArray((data as any)?.items)) {
            const canonical = tracksToCanonical(
              (data as any).items,
              "artist_featured",
            );
            if (ctx?.waitUntil && canonical.length > 0) {
              ctx.waitUntil(upsertTracks(env, canonical));
            }
          }
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
            };
            if (Array.isArray(body.tracks)) {
              targets = body.tracks.filter((t) => t && (t.id || t.title));
            } else if (body.id) {
              targets = [{ id: body.id, title: body.title || "" }];
            }
          } else {
            const id = searchParams.get("id");
            const title = searchParams.get("title") || "";
            if (id) targets = [{ id, title }];
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

          data = await handleFixMetadata(targets, env);
          break;
        }
        case "playlist": {
          const id = searchParams.get("id");
          const all = searchParams.get("all") === "true";
          if (!id) throw new Error("Missing id parameter");
          data = await getPlaylist(id, all, env);
          if (env.CATALOG_DO && Array.isArray((data as any)?.items)) {
            const canonical = tracksToCanonical(
              (data as any).items,
              "artist_featured",
            );
            if (ctx?.waitUntil && canonical.length > 0) {
              ctx.waitUntil(upsertTracks(env, canonical));
            }
          }
          break;
        }
        case "search": {
          const q = searchParams.get("q");
          const f = searchParams.get("f");
          if (!q) throw new Error("Missing q parameter");
          data = await getSearch({ q, f: f || undefined });
          if (env.CATALOG_DO && Array.isArray(data)) {
            const canonical = tracksToCanonical(data as any, "search");
            if (ctx?.waitUntil && canonical.length > 0) {
              ctx.waitUntil(upsertTracks(env, canonical));
            }
          }
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
            "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600",
        },
      });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: message.startsWith("Missing") ? 400 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
