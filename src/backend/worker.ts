import getAlbum from "./getAlbum.js";
import getArtist from "./getArtist.js";
import getChannel from "./getChannel.js";
import getGallery from "./getGallery.js";
import getPlaylist from "./getPlaylist.js";
import getSearch from "./getSearch.js";
import getSearchSuggestions from "./getSearchSuggestions.js";
import getSimilar from "./getSimilar.js";
import getSubFeed from "./getSubFeed.js";
import { handleFixMetadata, type FixTarget } from "./fixMetadata.js";
import { UserSyncDO } from "./UserSyncDO.ts";
import type {
  Request,
  ExecutionContext,
  DurableObjectNamespace,
} from "@cloudflare/workers-types";

export { UserSyncDO };

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

export interface Env {
  USER_SYNC_DO?: DurableObjectNamespace;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
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

    // --- Sync Hash Route (Stateless SHA-256) ---\
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
        case "gallery": {
          const id = searchParams.get("id");
          if (!id) throw new Error("Missing id parameter");
          data = await getGallery(id.split(","));
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
          "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600",
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
