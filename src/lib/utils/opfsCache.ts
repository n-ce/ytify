import { proxyHandler } from "./helpers";

const OPFS_DIR = "opus_cache";

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
 * Retrieves a playable Object URL for a cached Opus audio track, or null if not found.
 */
export async function getCachedOpusUrl(id: string): Promise<string | null> {
  if (!id) return null;
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return null;
    const fileHandle = await dir.getFileHandle(`${id}.opus`);
    const file = await fileHandle.getFile();
    if (!file || file.size === 0) return null;
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
 * Fetches and saves the highest-quality Opus audio stream directly to OPFS.
 * Prioritizes itag 251 (~160 kbps Opus), with fallbacks to other Opus bitrates.
 */
export async function cacheHighestQualityOpus(id: string): Promise<boolean> {
  if (!id) return false;
  if (await isTrackCached(id)) return true;

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

    console.log(`[OPFS] Successfully cached highest quality Opus for: ${id}`);
    return true;
  } catch (err) {
    console.warn(`[OPFS] Failed to cache track ${id}:`, err);
    return false;
  }
}

/**
 * Deletes a cached Opus track from OPFS.
 */
export async function deleteCachedOpus(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const dir = await getOpfsAudioDir();
    if (!dir) return false;
    await dir.removeEntry(`${id}.opus`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all cached Opus audio files in OPFS.
 */
export async function clearOpusCache(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(OPFS_DIR, { recursive: true });
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
        count++;
        const file = await entry.getFile();
        totalBytes += file.size;
      }
    }

    return { count, totalBytes };
  } catch {
    return { count: 0, totalBytes: 0 };
  }
}
