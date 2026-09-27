import { proxyHandler } from "../utils/helpers";
import { config } from "../utils/config";
import { generateImageUrl } from "../utils/image";

const OPFS_DIR = "opus_cache";
const CACHED_STORAGE_KEY = "library_cached";
const BYTES_PER_MB = 1024 * 1024;

// In-memory cache for Object URLs to avoid duplicate createObjectURL allocations
const thumbnailObjectUrls = new Map<string, string>();

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
 * Returns an array of track IDs currently cached in OPFS, preserving recency order.
 */
export async function getCachedTrackIds(): Promise<string[]> {
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return readCachedIds();

    const onDisk: string[] = [];
    // @ts-ignore - values() iterator exists on modern FileSystemDirectoryHandle
    for await (const entry of dir.values()) {
      if (entry.kind === "file" && entry.name.endsWith(".opus")) {
        onDisk.push(entry.name.replace(/\.opus$/, ""));
      }
    }

    const known = readCachedIds();
    const ordered = [
      ...known.filter((id) => onDisk.includes(id)),
      ...onDisk.filter((id) => !known.includes(id)),
    ];

    writeCachedIds(ordered);
    return ordered;
  } catch {
    return readCachedIds();
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
 * Checks whether a track's thumbnail image is cached in OPFS.
 */
export async function isThumbnailCached(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return false;
    const fileHandle = await dir.getFileHandle(`${id}.thumb`);
    const file = await fileHandle.getFile();
    return Boolean(file && file.size > 0);
  } catch {
    return false;
  }
}

/**
 * Retrieves an Object URL for a cached track thumbnail, or null if not found.
 */
export async function getCachedThumbnailUrl(
  id: string,
): Promise<string | null> {
  if (!id || config.cachingMode === "off") return null;
  if (thumbnailObjectUrls.has(id)) {
    return thumbnailObjectUrls.get(id)!;
  }
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return null;
    const fileHandle = await dir.getFileHandle(`${id}.thumb`);
    const file = await fileHandle.getFile();
    if (!file || file.size === 0) return null;
    const blob = file.type ? file : file.slice(0, file.size, "image/webp");
    const url = URL.createObjectURL(blob);
    thumbnailObjectUrls.set(id, url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Fetches and saves the track's thumbnail directly to OPFS as part of the audio cache.
 */
export async function cacheTrackThumbnail(id: string): Promise<boolean> {
  if (!id || config.cachingMode === "off") return false;
  if (await isThumbnailCached(id)) return true;

  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return false;

    // 1. Try generateImageUrl (wsrv proxy)
    const primaryUrl = generateImageUrl(id, "mq");
    let res: Response | null = null;
    try {
      if (primaryUrl) {
        res = await fetch(primaryUrl);
      }
    } catch {}

    // 2. Fallback to direct YouTube mqdefault / hqdefault
    if (!res || !res.ok || !res.body) {
      try {
        res = await fetch(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
      } catch {}
    }

    if (!res || !res.ok || !res.body) return false;

    const fileHandle = await dir.getFileHandle(`${id}.thumb`, { create: true });
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
 * Deletes a cached thumbnail from OPFS and revokes its memory URL.
 */
export async function deleteCachedThumbnail(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return false;
    await dir.removeEntry(`${id}.thumb`);
    if (thumbnailObjectUrls.has(id)) {
      URL.revokeObjectURL(thumbnailObjectUrls.get(id)!);
      thumbnailObjectUrls.delete(id);
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
export async function cacheHighestQualityOpus(id: string): Promise<boolean> {
  if (!id || config.cachingMode === "off") return false;
  if (await isTrackCached(id)) {
    touchCachedTrack(id);
    if (!(await isThumbnailCached(id))) {
      cacheTrackThumbnail(id).catch(() => {});
    }
    return true;
  }

  try {
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
    await cacheTrackThumbnail(id).catch(() => {});

    console.log(
      `[OPFS] Successfully cached highest quality Opus and thumbnail for: ${id}`,
    );
    return true;
  } catch (err) {
    console.warn(`[OPFS] Failed to cache track ${id}:`, err);
    return false;
  }
}

/**
 * Caches a batch of tracks in descending priority, then trims the cache to the
 * configured ceiling. Returns the track IDs that eviction removed.
 */
export async function cacheTracks(ids: string[]): Promise<string[]> {
  if (config.cachingMode === "off") return [];

  for (const id of ids) {
    if (id) await cacheHighestQualityOpus(id);
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
        const id = entry.name.replace(/\.thumb$/, "");
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
    try {
      await dir.removeEntry(`${id}.thumb`);
    } catch {}
    if (thumbnailObjectUrls.has(id)) {
      URL.revokeObjectURL(thumbnailObjectUrls.get(id)!);
      thumbnailObjectUrls.delete(id);
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
    await dir.removeEntry(`${id}.thumb`).catch(() => {});
    if (thumbnailObjectUrls.has(id)) {
      URL.revokeObjectURL(thumbnailObjectUrls.get(id)!);
      thumbnailObjectUrls.delete(id);
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
