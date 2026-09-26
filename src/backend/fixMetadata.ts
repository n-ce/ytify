import { YTNodes } from "youtubei.js";
import { getClient, getVideoId } from "./utils.js";
import type { Env } from "./worker.js";

export interface FixTarget {
  id: string;
  title: string;
}

export interface ResolvedMetadata {
  author: string;
  authorId: string;
  title: string;
}

const fastCache = new Map<string, ResolvedMetadata>();
const DO_NAME = "global:metadata_fix_cache";

/**
 * Strips common clutter from song titles to increase YouTube Music search precision.
 */
function cleanSearchTitle(title: string): string {
  if (!title) return "";
  let clean = title
    .replace(/\s*[\(\[](?:official\s+)?(?:music\s+)?(?:audio|video|lyric\s+video|visualizer|hd|hq|extended|clean|explicit|remaster(?:ed)?)[\)\]]/gi, "")
    .replace(/\.(mp3|opus|m4a|wav|flac)$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return clean || title;
}

/**
 * Checks if an author string is a placeholder/corrupted "Release - Topic".
 */
export function isCorruptedArtist(name?: string): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return (
    n === "release - topic" ||
    n === "release" ||
    n === "various artists - topic" ||
    n === "various artists" ||
    n === "unknown"
  );
}

/**
 * Resolves true author and authorId using the YouTube Music Search Songs API.
 */
export async function resolveTrackMetadataViaSearch(
  target: FixTarget,
): Promise<ResolvedMetadata | null> {
  if (!target.id && !target.title) return null;

  try {
    const yt = await getClient();
    const query = cleanSearchTitle(target.title);
    if (!query) return null;

    const results = await yt.music.search(query, { type: "song" });
    const contents = results.songs?.contents || [];
    if (contents.length === 0) return null;

    let matchedSong: YTNodes.MusicResponsiveListItem | null = null;

    // 1. Primary match: Check for exact video ID match
    for (const node of contents) {
      if (node.is(YTNodes.MusicResponsiveListItem)) {
        const item = node.as(YTNodes.MusicResponsiveListItem);
        const vid = getVideoId(item);
        if (vid && vid === target.id) {
          matchedSong = item;
          break;
        }
      }
    }

    // 2. Secondary match: If exact ID is absent, take the first result with a valid artist
    if (!matchedSong) {
      for (const node of contents) {
        if (node.is(YTNodes.MusicResponsiveListItem)) {
          const item = node.as(YTNodes.MusicResponsiveListItem);
          const artistName = item.artists?.[0]?.name;
          if (artistName && !isCorruptedArtist(artistName)) {
            matchedSong = item;
            break;
          }
        }
      }
    }

    if (!matchedSong) return null;

    const rawArtist = matchedSong.artists?.[0]?.name?.trim();
    if (!rawArtist || isCorruptedArtist(rawArtist)) return null;

    const authorId = matchedSong.artists?.[0]?.channel_id || "";
    const cleanTitle = matchedSong.title?.toString() || target.title;
    const author = rawArtist.endsWith(" - Topic") ? rawArtist : `${rawArtist} - Topic`;

    return {
      author,
      authorId,
      title: cleanTitle,
    };
  } catch (err) {
    console.error(`[fixMetadata] Error searching music for ${target.id} (${target.title}):`, err);
    return null;
  }
}

/**
 * Batch-resolves metadata targets with multi-tier caching (in-memory -> DO SQLite -> Music Search).
 */
export async function handleFixMetadata(
  targets: FixTarget[],
  env?: Env,
): Promise<{ resolved: Record<string, ResolvedMetadata>; failed: string[] }> {
  const resolved: Record<string, ResolvedMetadata> = {};
  const failed: string[] = [];
  const missingFromMemory: FixTarget[] = [];

  // Step 1: Check fast in-memory cache
  for (const t of targets) {
    if (t.id && fastCache.has(t.id)) {
      resolved[t.id] = fastCache.get(t.id)!;
    } else {
      missingFromMemory.push(t);
    }
  }

  if (missingFromMemory.length === 0) {
    return { resolved, failed };
  }

  // Step 2: Check Durable Object SQLite store if available
  const missingFromDO: FixTarget[] = [];
  let doStub: any = null;

  if (env?.USER_SYNC_DO) {
    try {
      const doId = env.USER_SYNC_DO.idFromName(DO_NAME);
      doStub = env.USER_SYNC_DO.get(doId);

      const idsToFetch = missingFromMemory.map((t) => t.id).filter(Boolean);
      if (idsToFetch.length > 0) {
        const doRes = await doStub.fetch(
          new Request(`http://do/metadata-fix?ids=${encodeURIComponent(idsToFetch.join(","))}`),
        );
        if (doRes.ok) {
          const cachedMap = (await doRes.json()) as Record<string, ResolvedMetadata>;
          for (const t of missingFromMemory) {
            if (cachedMap[t.id]) {
              resolved[t.id] = cachedMap[t.id];
              fastCache.set(t.id, cachedMap[t.id]);
            } else {
              missingFromDO.push(t);
            }
          }
        } else {
          missingFromDO.push(...missingFromMemory);
        }
      }
    } catch (e) {
      console.warn("[fixMetadata] Error reading from DO cache:", e);
      missingFromDO.push(...missingFromMemory);
    }
  } else {
    missingFromDO.push(...missingFromMemory);
  }

  if (missingFromDO.length === 0) {
    return { resolved, failed };
  }

  // Step 3: Resolve remaining items via Music Search API with concurrency limit
  const newlyResolved: Record<string, ResolvedMetadata> = {};
  const CONCURRENCY = 3;

  for (let i = 0; i < missingFromDO.length; i += CONCURRENCY) {
    const slice = missingFromDO.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (target) => {
        const result = await resolveTrackMetadataViaSearch(target);
        if (result && target.id) {
          resolved[target.id] = result;
          newlyResolved[target.id] = result;
          fastCache.set(target.id, result);
        } else if (target.id) {
          failed.push(target.id);
        }
      }),
    );
  }

  // Step 4: Persist newly resolved records to DO SQLite store
  if (doStub && Object.keys(newlyResolved).length > 0) {
    try {
      await doStub.fetch(
        new Request("http://do/metadata-fix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newlyResolved),
        }),
      );
    } catch (e) {
      console.warn("[fixMetadata] Error persisting to DO cache:", e);
    }
  }

  return { resolved, failed };
}
