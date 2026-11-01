import {
  convertSStoHHMMSS,
  formatDuration,
  formatThumbnailId,
  getShardName,
  stripTopic,
  unique,
} from "./utils.js";

export interface CatalogTrack {
  id: string;
  title: string;
  author: string;
  authorId: string;
  duration: string;
  durationSeconds: number;
  type: "song" | "video";
  isSong: boolean;
  img?: string;
  thumbnailId?: string;
  albumId?: string;
  albumTitle?: string;
  source: "catalog_shard";
}

export interface CatalogResolveResult {
  resolved: Record<string, CatalogTrack>;
  unresolved: string[];
}

const DATASET_BASE_URL =
  "https://raw.githubusercontent.com/n-ce/Moods-And-Genres-Dataset/main/data";

const shardCache = new Map<string, Promise<Record<string, any>>>();
let albumsPromise: Promise<Record<string, any>> | null = null;

export function clearCatalogCacheForTests(): void {
  shardCache.clear();
  albumsPromise = null;
}

async function fetchJson<T>(
  relativePath: string,
  env?: { CATALOG_BASE_URL?: string },
): Promise<T | null> {
  const base = (env?.CATALOG_BASE_URL || DATASET_BASE_URL).replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/${relativePath.replace(/^\/+/, "")}`);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

function loadShard(
  type: "songs" | "videos",
  shard: string,
  env?: { CATALOG_BASE_URL?: string },
): Promise<Record<string, any>> {
  const key = `${type}/${shard}`;
  let pending = shardCache.get(key);
  if (!pending) {
    pending = fetchJson<Record<string, any>>(`${key}.json`, env).then(
      (data) => {
        if (!data) shardCache.delete(key);
        return data || {};
      },
      () => {
        shardCache.delete(key);
        return {};
      },
    );
    shardCache.set(key, pending);
  }
  return pending;
}

function loadAlbums(env?: {
  CATALOG_BASE_URL?: string;
}): Promise<Record<string, any>> {
  if (!albumsPromise) {
    albumsPromise = fetchJson<Record<string, any>>("albums.json", env).then(
      (data) => {
        if (!data) albumsPromise = null;
        return data || {};
      },
      () => {
        albumsPromise = null;
        return {};
      },
    );
  }
  return albumsPromise;
}

function toTrack(
  id: string,
  raw: any,
  isSong: boolean,
  albumTitle?: string,
): CatalogTrack {
  const durationSeconds = raw.duration || 0;
  const duration = formatDuration(
    raw.durationStr ||
      (durationSeconds ? convertSStoHHMMSS(durationSeconds) : "00:00"),
  );
  const track: CatalogTrack = {
    id: raw.id || id,
    title: raw.title || "Unknown",
    author: stripTopic(raw.author || "Unknown"),
    authorId: raw.authorId || "",
    duration,
    durationSeconds,
    type: isSong ? "song" : "video",
    isSong,
    source: "catalog_shard",
  };

  if (isSong) {
    if (raw.thumbnailId) {
      track.thumbnailId = raw.thumbnailId;
      track.img = formatThumbnailId(raw.thumbnailId);
    }
    if (raw.albumId) track.albumId = raw.albumId;
    if (albumTitle) track.albumTitle = albumTitle;
  }

  return track;
}

/**
 * Resolves track IDs against Moods-And-Genres-Dataset shards (songs/ and videos/).
 * Fetches directly from the online repository with in-memory promise caching.
 */
export default async function getCatalog(
  rawIds: string[],
  env?: { CATALOG_BASE_URL?: string },
): Promise<CatalogResolveResult> {
  const ids = unique(
    rawIds
      .map((id) => (typeof id === "string" ? id.trim() : ""))
      .filter(Boolean),
  );
  const resolved: Record<string, CatalogTrack> = {};
  const unresolved: string[] = [];

  if (ids.length === 0) {
    return { resolved, unresolved };
  }

  const shardMap = new Map<string, string[]>();
  for (const id of ids) {
    const shard = getShardName(id);
    const list = shardMap.get(shard);
    if (list) list.push(id);
    else shardMap.set(shard, [id]);
  }

  await Promise.all(
    Array.from(shardMap.entries()).map(async ([shard, shardIds]) => {
      const songShard = await loadShard("songs", shard, env);
      const missing: string[] = [];

      // Check if any songs in this shard have an albumId to fetch albums once
      const needsAlbums = shardIds.some((id) => songShard[id]?.albumId);
      const albums = needsAlbums ? await loadAlbums(env) : null;

      for (const id of shardIds) {
        const song = songShard[id];
        if (song) {
          const albumTitle = song.albumId
            ? albums?.[song.albumId]?.title
            : undefined;
          resolved[id] = toTrack(id, song, true, albumTitle);
        } else {
          missing.push(id);
        }
      }

      if (missing.length > 0) {
        const videoShard = await loadShard("videos", shard, env);
        for (const id of missing) {
          const video = videoShard[id];
          if (video) {
            resolved[id] = toTrack(id, video, false);
          } else {
            unresolved.push(id);
          }
        }
      }
    }),
  );

  return { resolved, unresolved };
}
