import { proxyHandler } from "../utils/helpers";
import { config } from "../utils/config";
import { generateArtworkUrl, generateImageUrl } from "../utils/image";

const OPFS_DIR = "opus_cache";
const CACHED_STORAGE_KEY = "library_cached";
const BYTES_PER_MB = 1024 * 1024;

// In-memory cache for Object URLs to avoid duplicate createObjectURL allocations.
// Keyed by file name, since a track can hold both a landscape and a square thumb.
const thumbnailObjectUrls = new Map<string, string>();

// Tracks whose bytes are being written right now, so reconciliation never
// deletes a file out from under an in-flight cache write.
const inFlight = new Set<string>();

// Music ("- Topic") tracks are shown square, everything else stays 16:9, so each
// variant gets its own file instead of one file serving the wrong aspect ratio.
function thumbFileName(id: string, music?: boolean): string {
  return `${id}${music ? ".sq" : ""}.thumb`;
}

function thumbFileNames(id: string): string[] {
  return [`${id}.thumb`, `${id}.sq.thumb`];
}

function thumbIdFromFileName(name: string): string {
  return name.replace(/\.thumb$/, "").replace(/\.sq$/, "");
}

function readCachedIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHED_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function writeCachedIds(ids: string[]) {
  localStorage.setItem(CACHED_STORAGE_KEY, JSON.stringify(ids));
}

/**
 * Returns the FileSystemDirectoryHandle for the OPFS opus audio cache, or null if unsupported.
 */
export async function getOpfsAudioDir(): Promise<FileSystemDirectoryHandle | null> {
  if (
    typeof navigator === "undefined" ||
    !("storage" in navigator) ||
    !("getDirectory" in navigator.storage)
  ) {
    return null;
  }
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(OPFS_DIR, { create: true });
  } catch (err) {
    console.warn("[OPFS] Failed to access OPFS directory:", err);
    return null;
  }
}

/**
 * Returns an array of track IDs currently cached in local cache state synchronously.
 * The list is kept most-recently-used first and doubles as the LRU eviction order.
 */
export function getCachedTrackIdsSync(): string[] {
  return readCachedIds();
}

/**
 * Moves a track to the head of the recency list, marking it as most recently used.
 */
export function touchCachedTrack(id: string) {
  if (!id) return;
  const ids = readCachedIds();
  const index = ids.indexOf(id);
  if (index === 0) return;
  if (index > 0) ids.splice(index, 1);
  ids.unshift(id);
  writeCachedIds(ids);
}

/**
 * Reconciles OPFS against the cached-id list. The list is authoritative: entries
 * with no audio file are dropped, and files no entry vouches for are deleted.
 * This is what keeps a cleaned, re-imported or re-synced library from leaving
 * the origin holding audio that is unreachable from the cached collection.
 * Returns the surviving ids in recency order.
 */
export async function getCachedTrackIds(): Promise<string[]> {
  const known = readCachedIds();
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return known;

    const files = new Map<string, string[]>();
    // @ts-ignore - values() iterator exists on modern FileSystemDirectoryHandle
    for await (const entry of dir.values()) {
      if (entry.kind !== "file") continue;
      const id = entry.name.endsWith(".opus")
        ? entry.name.replace(/\.opus$/, "")
        : entry.name.endsWith(".thumb")
          ? thumbIdFromFileName(entry.name)
          : null;
      if (!id) continue;
      const names = files.get(id);
      if (names) names.push(entry.name);
      else files.set(id, [entry.name]);
    }

    const survivors = new Set<string>();
    const vouched = new Set(known);
    for (const [id, names] of files) {
      if (
        vouched.has(id) &&
        !inFlight.has(id) &&
        names.some((n) => n.endsWith(".opus"))
      )
        survivors.add(id);
    }

    let pruned = 0;
    for (const [id, names] of files) {
      if (survivors.has(id)) continue;
      for (const name of names) {
        await dir.removeEntry(name).catch(() => {});
        if (thumbnailObjectUrls.has(name)) {
          URL.revokeObjectURL(thumbnailObjectUrls.get(name)!);
          thumbnailObjectUrls.delete(name);
        }
        pruned++;
      }
    }
    if (pruned) console.log(`[OPFS] Pruned ${pruned} orphaned cache file(s)`);

    const ordered = known.filter((id) => survivors.has(id));
    writeCachedIds(ordered);
    return ordered;
  } catch {
    return known;
  }
}

/**
 * Retrieves a playable Object URL for a cached Opus audio track, or null if not found.
 */
export async function getCachedOpusUrl(id: string): Promise<string | null> {
  if (!id || config.cachingMode === "off") return null;
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return null;
    const fileHandle = await dir.getFileHandle(`${id}.opus`);
    const file = await fileHandle.getFile();
    if (!file || file.size === 0) return null;
    touchCachedTrack(id);
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

/**
 * Checks whether a track's audio is already cached in OPFS.
 */
export async function isTrackCached(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return false;
    const fileHandle = await dir.getFileHandle(`${id}.opus`);
    const file = await fileHandle.getFile();
    return Boolean(file && file.size > 0);
  } catch {
    return false;
  }
}

/**
 * Checks whether a track's thumbnail image is cached in OPFS for the given variant.
 */
export async function isThumbnailCached(
  id: string,
  music?: boolean,
): Promise<boolean> {
  if (!id) return false;
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return false;
    const fileHandle = await dir.getFileHandle(thumbFileName(id, music));
    const file = await fileHandle.getFile();
    return Boolean(file && file.size > 0);
  } catch {
    return false;
  }
}

/**
 * Retrieves an Object URL for a cached track thumbnail, or null if not found.
 * Pass the same music flag used to build the image url so the cached blob keeps
 * the aspect ratio the caller is about to render.
 */
export async function getCachedThumbnailUrl(
  id: string,
  music?: boolean,
): Promise<string | null> {
  if (!id || config.cachingMode === "off") return null;
  const name = thumbFileName(id, music);
  if (thumbnailObjectUrls.has(name)) {
    return thumbnailObjectUrls.get(name)!;
  }
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return null;
    const fileHandle = await dir.getFileHandle(name);
    const file = await fileHandle.getFile();
    if (!file || file.size === 0) return null;
    const blob = file.type ? file : file.slice(0, file.size, "image/webp");
    const url = URL.createObjectURL(blob);
    thumbnailObjectUrls.set(name, url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Fetches and saves the track's artwork directly to OPFS as part of the audio cache.
 * The primary source is the exact wsrv url the player renders, so a cached thumbnail
 * is never a different crop or aspect ratio than the live one.
 */
export async function cacheTrackThumbnail(
  id: string,
  music?: boolean,
): Promise<boolean> {
  if (!id || config.cachingMode === "off") return false;
  if (await isThumbnailCached(id, music)) return true;

  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return false;

    const candidates = [
      generateArtworkUrl(id, music),
      generateImageUrl(id, "hq", music),
      generateImageUrl(id, "mq", music),
    ];

    let res: Response | null = null;
    for (const url of candidates) {
      if (!url) continue;
      try {
        const attempt = await fetch(url);
        if (attempt.ok && attempt.body) {
          res = attempt;
          break;
        }
      } catch {}
    }

    if (!res) {
      try {
        res = await fetch(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
      } catch {}
    }

    if (!res || !res.ok || !res.body) return false;

    const fileHandle = await dir.getFileHandle(thumbFileName(id, music), {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await res.body.pipeTo(writable);

    console.log(`[OPFS] Successfully cached thumbnail for: ${id}`);
    return true;
  } catch (err) {
    console.warn(`[OPFS] Failed to cache thumbnail for ${id}:`, err);
    return false;
  }
}

/**
 * Deletes every cached thumbnail variant for a track and revokes its memory URLs.
 */
export async function deleteCachedThumbnail(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return false;
    for (const name of thumbFileNames(id)) {
      await dir.removeEntry(name).catch(() => {});
      if (thumbnailObjectUrls.has(name)) {
        URL.revokeObjectURL(thumbnailObjectUrls.get(name)!);
        thumbnailObjectUrls.delete(name);
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches and saves the highest-quality Opus audio stream directly to OPFS.
 * Prioritizes itag 251 (~160 kbps Opus), with fallbacks to other Opus bitrates.
 * Also caches the track thumbnail alongside the audio track.
 */
export async function cacheHighestQualityOpus(
  id: string,
  music?: boolean,
): Promise<boolean> {
  if (!id || config.cachingMode === "off") return false;
  inFlight.add(id);
  try {
    if (await isTrackCached(id)) {
      touchCachedTrack(id);
      if (!(await isThumbnailCached(id, music))) {
        cacheTrackThumbnail(id, music).catch(() => {});
      }
      return true;
    }

    const getStreamData = await import("@modules/getStreamData").then(
      (m) => m.default,
    );
    const data = await getStreamData(id);

    if (
      !data ||
      !("adaptiveFormats" in data) ||
      !Array.isArray(data.adaptiveFormats)
    ) {
      return false;
    }

    const audioStreams = data.adaptiveFormats.filter(
      (s: { type?: string; url?: string }) =>
        s.type?.startsWith("audio/") && s.url,
    );

    if (audioStreams.length === 0) return false;

    // 1. Prioritize itag 251 (Opus ~160kbps, YouTube's highest audio quality)
    let bestStream = audioStreams.find((s: { url: string }) =>
      s.url.includes("itag=251"),
    );

    // 2. Fallback: highest bitrate Opus stream
    if (!bestStream) {
      const opusStreams = audioStreams
        .filter((s: { type: string }) => s.type.includes("opus"))
        .sort(
          (a: { bitrate?: string }, b: { bitrate?: string }) =>
            parseInt(b.bitrate || "0", 10) - parseInt(a.bitrate || "0", 10),
        );
      if (opusStreams.length > 0) bestStream = opusStreams[0];
    }

    // 3. Fallback: highest bitrate audio stream of any format
    if (!bestStream) {
      bestStream = audioStreams.sort(
        (a: { bitrate?: string }, b: { bitrate?: string }) =>
          parseInt(b.bitrate || "0", 10) - parseInt(a.bitrate || "0", 10),
      )[0];
    }

    if (!bestStream?.url) return false;

    const streamUrl = proxyHandler(bestStream.url, true);
    const res = await fetch(streamUrl);
    if (!res.ok || !res.body) return false;

    const dir = await getOpfsAudioDir();
    if (!dir) return false;

    const fileHandle = await dir.getFileHandle(`${id}.opus`, { create: true });
    const writable = await fileHandle.createWritable();
    await res.body.pipeTo(writable);

    touchCachedTrack(id);

    // Cache thumbnail alongside the opus audio track
    await cacheTrackThumbnail(id, music).catch(() => {});

    console.log(
      `[OPFS] Successfully cached highest quality Opus and thumbnail for: ${id}`,
    );
    return true;
  } catch (err) {
    console.warn(`[OPFS] Failed to cache track ${id}:`, err);
    return false;
  } finally {
    inFlight.delete(id);
  }
}

/**
 * Caches a batch of tracks in descending priority, then trims the cache to the
 * configured ceiling. Returns the track IDs that eviction removed.
 */
export async function cacheTracks(
  ids: string[],
  music?: boolean,
): Promise<string[]> {
  if (config.cachingMode === "off") return [];

  for (const id of ids) {
    if (id) await cacheHighestQualityOpus(id, music);
  }

  return enforceCacheLimit();
}

/**
 * Evicts least-recently-used tracks until the cache fits within the configured
 * size limit. Returns the evicted track IDs.
 */
export async function enforceCacheLimit(): Promise<string[]> {
  if (config.cachingMode === "off") return [];

  const dir = await getOpfsAudioDir();
  if (!dir) return [];

  const sizes = new Map<string, number>();
  // @ts-ignore - values() iterator exists on modern FileSystemDirectoryHandle
  for await (const entry of dir.values()) {
    if (entry.kind === "file") {
      if (entry.name.endsWith(".opus")) {
        const id = entry.name.replace(/\.opus$/, "");
        sizes.set(id, (sizes.get(id) || 0) + (await entry.getFile()).size);
      } else if (entry.name.endsWith(".thumb")) {
        const id = thumbIdFromFileName(entry.name);
        sizes.set(id, (sizes.get(id) || 0) + (await entry.getFile()).size);
      }
    }
  }

  const limitBytes = config.cacheLimit * BYTES_PER_MB;
  let totalBytes = 0;
  for (const size of sizes.values()) totalBytes += size;
  if (totalBytes <= limitBytes) return [];

  // Oldest first, so the tail of the recency list is the first to go.
  const known = readCachedIds();
  const byAge = [
    ...known.filter((id) => sizes.has(id)),
    ...[...sizes.keys()].filter((id) => !known.includes(id)),
  ].reverse();

  const evicted: string[] = [];
  for (const id of byAge) {
    if (totalBytes <= limitBytes) break;
    try {
      await dir.removeEntry(`${id}.opus`);
    } catch {}
    for (const name of thumbFileNames(id)) {
      try {
        await dir.removeEntry(name);
      } catch {}
      if (thumbnailObjectUrls.has(name)) {
        URL.revokeObjectURL(thumbnailObjectUrls.get(name)!);
        thumbnailObjectUrls.delete(name);
      }
    }
    totalBytes -= sizes.get(id) || 0;
    evicted.push(id);
  }

  if (evicted.length) {
    writeCachedIds(readCachedIds().filter((id) => !evicted.includes(id)));
    console.log(
      `[OPFS] Evicted ${evicted.length} track(s) to stay under ${config.cacheLimit}MB`,
    );
  }

  return evicted;
}

/**
 * Deletes a cached Opus track and its thumbnail from OPFS.
 */
export async function deleteCachedOpus(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return false;
    await dir.removeEntry(`${id}.opus`).catch(() => {});
    for (const name of thumbFileNames(id)) {
      await dir.removeEntry(name).catch(() => {});
      if (thumbnailObjectUrls.has(name)) {
        URL.revokeObjectURL(thumbnailObjectUrls.get(name)!);
        thumbnailObjectUrls.delete(name);
      }
    }
    writeCachedIds(readCachedIds().filter((item) => item !== id));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all cached Opus audio files and thumbnails in OPFS.
 */
export async function clearOpusCache(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(OPFS_DIR, { recursive: true });
    for (const url of thumbnailObjectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    thumbnailObjectUrls.clear();
    writeCachedIds([]);
  } catch (err) {
    console.warn("[OPFS] Failed to clear opus cache:", err);
  }
}

/**
 * Returns cache statistics (total files and approximate bytes used).
 */
export async function getOpusCacheStats(): Promise<{
  count: number;
  totalBytes: number;
}> {
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return { count: 0, totalBytes: 0 };

    let count = 0;
    let totalBytes = 0;

    // @ts-ignore - values() iterator exists on modern FileSystemDirectoryHandle
    for await (const entry of dir.values()) {
      if (entry.kind === "file") {
        if (entry.name.endsWith(".opus")) count++;
        const file = await entry.getFile();
        totalBytes += file.size;
      }
    }

    return { count, totalBytes };
  } catch {
    return { count: 0, totalBytes: 0 };
  }
}

export const streamCache = {
  get: (id: string): Invidious | null => {
    try {
      const data = sessionStorage.getItem(`streamData_${id}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Failed to parse stream data from cache", e);
      return null;
    }
  },
  set: (id: string, data: Invidious) => {
    try {
      sessionStorage.setItem(`streamData_${id}`, JSON.stringify(data));
    } catch (e) {
      console.warn(
        "Failed to save stream data to cache (possibly storage limit reached)",
        e,
      );
    }
  },
  remove: (id: string) => {
    sessionStorage.removeItem(`streamData_${id}`);
  },
  clear: () => {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("streamData_")) {
        sessionStorage.removeItem(key);
      }
    });
  },
};
