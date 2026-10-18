import type { DurableObjectStub } from "@cloudflare/workers-types";
import type { Env } from "./env.js";
import type {
  CanonicalTrack,
  Category,
  CuratedPlaylist,
  Recommendation,
} from "./catalog.js";
const CATALOG_DO_NAME = "global";

/**
 * A Durable Object stub takes the Cloudflare flavour of `Request`, which
 * carries a `fetcher` field the DOM type has no notion of. The runtime object
 * is identical, so the cast lives here and nowhere else.
 */
type DurableRequest = Parameters<DurableObjectStub["fetch"]>[0];

function durableRequest(path: string, init?: RequestInit): DurableRequest {
  return new Request(`http://do/${path}`, init) as unknown as DurableRequest;
}

export function getCatalogStub(env: Env | undefined): DurableObjectStub | null {
  if (!env?.CATALOG_DO) return null;
  return env.CATALOG_DO.get(env.CATALOG_DO.idFromName(CATALOG_DO_NAME));
}

// ---------------------------------------------------------------------------
// In-Memory Isolate Caching & Dedup Latch
// ---------------------------------------------------------------------------

const CATEGORY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const memoryCategoryCache = new Map<
  string,
  { categories: Category[]; expires: number }
>();

// In-memory latch of recently written tracks (prevents redundant SQLite writes)
const recentlyWrittenTracks = new Set<string>();
const RECENT_WRITE_LIMIT = 2000;

export function _clearTrackLatchForTests() {
  recentlyWrittenTracks.clear();
}

async function post(
  stub: DurableObjectStub,
  path: string,
  body: unknown,
): Promise<boolean> {
  try {
    const res = await stub.fetch(
      durableRequest(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    if (!res.ok) {
      console.warn(`[catalog] ${path} failed with ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[catalog] ${path} failed:`, err);
    return false;
  }
}

export async function readTracks(
  env: Env | undefined,
  ids: string[],
): Promise<Record<string, CanonicalTrack>> {
  if (ids.length === 0) return {};

  const stub = getCatalogStub(env);
  if (!stub) return {};

  try {
    const res = await stub.fetch(
      durableRequest(`/tracks?ids=${encodeURIComponent(ids.join(","))}`),
    );
    if (!res.ok) return {};
    return (await res.json()) as Record<string, CanonicalTrack>;
  } catch (err) {
    console.warn("[catalog] track read failed:", err);
    return {};
  }
}

export async function readTracksSince(
  env: Env | undefined,
  since: number,
  limit = 200,
): Promise<CanonicalTrack[]> {
  const stub = getCatalogStub(env);
  if (!stub || since <= 0) return [];

  try {
    const res = await stub.fetch(
      durableRequest(`/tracks-since?since=${since}&limit=${limit}`),
    );
    if (!res.ok) return [];
    return (await res.json()) as CanonicalTrack[];
  } catch (err) {
    console.warn("[catalog] tracks-since failed:", err);
    return [];
  }
}

export async function readCategories(
  env: Env | undefined,
  type?: string | null,
): Promise<Category[]> {
  const cacheKey = type || "all";
  const now = Date.now();
  const cached = memoryCategoryCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.categories;
  }

  const stub = getCatalogStub(env);
  if (!stub) return [];

  try {
    const query = type ? `?type=${encodeURIComponent(type)}` : "";
    const res = await stub.fetch(durableRequest(`/categories${query}`));
    if (!res.ok) return [];
    const categories = (await res.json()) as Category[];
    memoryCategoryCache.set(cacheKey, {
      categories,
      expires: now + CATEGORY_CACHE_TTL_MS,
    });
    return categories;
  } catch (err) {
    console.warn("[catalog] category read failed:", err);
    return [];
  }
}

export async function readPlaylists(
  env: Env | undefined,
  category?: string | null,
  limit = 100,
): Promise<CuratedPlaylist[]> {
  const stub = getCatalogStub(env);
  if (!stub) return [];

  try {
    const query = new URLSearchParams();
    if (category) query.set("category", category);
    if (limit) query.set("limit", limit.toString());
    const res = await stub.fetch(durableRequest(`/playlists?${query}`));
    if (!res.ok) return [];
    return (await res.json()) as CuratedPlaylist[];
  } catch (err) {
    console.warn("[catalog] playlist read failed:", err);
    return [];
  }
}

export function upsertTracks(
  env: Env,
  tracks: CanonicalTrack[],
): Promise<boolean> {
  if (tracks.length === 0) return Promise.resolve(true);

  // Filter out tracks written recently in this isolate to prevent SQLite row-write thrashing
  const tracksToWrite: CanonicalTrack[] = [];
  for (const t of tracks) {
    if (!t?.id) continue;
    if (!recentlyWrittenTracks.has(t.id)) {
      tracksToWrite.push(t);
      recentlyWrittenTracks.add(t.id);
      if (recentlyWrittenTracks.size > RECENT_WRITE_LIMIT) {
        const first = recentlyWrittenTracks.values().next().value;
        if (first) recentlyWrittenTracks.delete(first);
      }
    }
  }

  if (tracksToWrite.length === 0) return Promise.resolve(true);

  const stub = getCatalogStub(env);
  return stub
    ? post(stub, "/tracks", { tracks: tracksToWrite })
    : Promise.resolve(false);
}

export function upsertCategories(
  env: Env,
  categories: Category[],
): Promise<boolean> {
  if (categories.length === 0) return Promise.resolve(true);
  memoryCategoryCache.clear();
  const stub = getCatalogStub(env);
  return stub
    ? post(stub, "/categories", { categories })
    : Promise.resolve(false);
}

export function upsertPlaylists(
  env: Env,
  playlists: CuratedPlaylist[],
): Promise<boolean> {
  if (playlists.length === 0) return Promise.resolve(true);
  const stub = getCatalogStub(env);
  return stub
    ? post(stub, "/playlists", { playlists })
    : Promise.resolve(false);
}

export function parkCategories(
  env: Env,
  categories: Category[],
): Promise<boolean> {
  if (categories.length === 0) return Promise.resolve(true);
  const stub = getCatalogStub(env);
  return stub
    ? post(stub, "/scrape-jobs", { categories })
    : Promise.resolve(false);
}

export async function recommendPlaylists(
  env: Env | undefined,
  trackIds: string[],
  limit = 20,
): Promise<Recommendation[]> {
  if (trackIds.length === 0) return [];
  const stub = getCatalogStub(env);
  if (!stub) return [];

  try {
    const res = await stub.fetch(
      durableRequest(`/recommend?limit=${limit}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds }),
      }),
    );
    if (!res.ok) return [];
    return (await res.json()) as Recommendation[];
  } catch (err) {
    console.warn("[catalog] recommend failed:", err);
    return [];
  }
}


export async function readScrapeStatus(
  env: Env | undefined,
): Promise<{ pending: number; alarmAt: number | null } | null> {
  const stub = getCatalogStub(env);
  if (!stub) return null;
  try {
    const res = await stub.fetch(durableRequest("/scrape-jobs"));
    if (!res.ok) return null;
    return (await res.json()) as { pending: number; alarmAt: number | null };
  } catch (err) {
    console.warn("[catalog] readScrapeStatus failed:", err);
    return null;
  }
}

export const recommend = recommendPlaylists;
export const readFeatured = recommendPlaylists;
