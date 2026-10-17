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
  const stub = getCatalogStub(env);
  if (!stub || ids.length === 0) return {};

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
  const stub = getCatalogStub(env);
  if (!stub) return [];

  try {
    const query = type ? `?type=${encodeURIComponent(type)}` : "";
    const res = await stub.fetch(durableRequest(`/categories${query}`));
    if (!res.ok) return [];
    return (await res.json()) as Category[];
  } catch (err) {
    console.warn("[catalog] category read failed:", err);
    return [];
  }
}

export async function readPlaylists(
  env: Env | undefined,
  category?: string | null,
): Promise<CuratedPlaylist[]> {
  const stub = getCatalogStub(env);
  if (!stub) return [];

  try {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const res = await stub.fetch(durableRequest(`/playlists${query}`));
    if (!res.ok) return [];
    return (await res.json()) as CuratedPlaylist[];
  } catch (err) {
    console.warn("[catalog] playlist read failed:", err);
    return [];
  }
}

export function upsertTracks(env: Env, tracks: CanonicalTrack[]): Promise<boolean> {
  if (tracks.length === 0) return Promise.resolve(true);
  const stub = getCatalogStub(env);
  return stub ? post(stub, "/tracks", { tracks }) : Promise.resolve(false);
}

export function upsertCategories(env: Env, categories: Category[]): Promise<boolean> {
  if (categories.length === 0) return Promise.resolve(true);
  const stub = getCatalogStub(env);
  return stub ? post(stub, "/categories", { categories }) : Promise.resolve(false);
}

export function upsertPlaylists(
  env: Env,
  playlists: CuratedPlaylist[],
): Promise<boolean> {
  if (playlists.length === 0) return Promise.resolve(true);
  const stub = getCatalogStub(env);
  return stub ? post(stub, "/playlists", { playlists }) : Promise.resolve(false);
}

export async function readScrapeStatus(
  env: Env,
): Promise<{ pending: number; alarmAt: number | null } | null> {
  const stub = getCatalogStub(env);
  if (!stub) return null;

  try {
    const res = await stub.fetch(durableRequest("/scrape-jobs"));
    if (!res.ok) return null;
    return (await res.json()) as { pending: number; alarmAt: number | null };
  } catch (err) {
    console.warn("[catalog] scrape status failed:", err);
    return null;
  }
}

export async function recommend(
  env: Env,
  ids: string[],
  limit = 10,
): Promise<Recommendation[]> {
  const stub = getCatalogStub(env);
  if (!stub || ids.length === 0) return [];

  try {
    const res = await stub.fetch(
      durableRequest(
        `/recommend?ids=${encodeURIComponent(ids.join(","))}&limit=${limit}`,
      ),
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { playlists: Recommendation[] };
    return data.playlists || [];
  } catch (err) {
    console.warn("[catalog] recommend failed:", err);
    return [];
  }
}
