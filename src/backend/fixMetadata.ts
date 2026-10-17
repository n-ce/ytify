import { YTNodes } from "youtubei.js";
import { getClient, getVideoId } from "./utils.js";
import { readTracks, upsertTracks } from "./catalogClient.js";
import type { CanonicalTrack } from "./catalog.js";
import type { Env } from "./env.js";

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
          const artistName = item.artists?.[0]?.name || (item as any).authors?.[0]?.name;
          if (artistName && !isCorruptedArtist(artistName)) {
            matchedSong = item;
            break;
          }
        }
      }
    }

    if (!matchedSong) return null;

    const rawArtist = (matchedSong.artists?.[0]?.name || (matchedSong as any).authors?.[0]?.name)?.trim();
    if (!rawArtist || isCorruptedArtist(rawArtist)) return null;

    const authorId = matchedSong.artists?.[0]?.channel_id || (matchedSong as any).authors?.[0]?.channel_id || "";
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
 * Batch-resolves metadata targets with multi-tier caching
 * (in-memory -> global catalog -> Music Search).
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

  // Step 2: Check the shared global catalog, which is also what link previews
  // and user sync read from, so every repair benefits all consumers at once.
  const missingFromCatalog: FixTarget[] = [];

  if (env?.CATALOG_DO) {
    const idsToFetch = missingFromMemory.map((t) => t.id).filter(Boolean);
    const cached = await readTracks(env, idsToFetch);

    for (const t of missingFromMemory) {
      const track = cached[t.id];
      if (track && !isCorruptedArtist(track.author)) {
        const entry: ResolvedMetadata = {
          author: track.author,
          authorId: track.authorId,
          title: track.title,
        };
        resolved[t.id] = entry;
        fastCache.set(t.id, entry);
      } else {
        missingFromCatalog.push(t);
      }
    }
  } else {
    missingFromCatalog.push(...missingFromMemory);
  }

  if (missingFromCatalog.length === 0) {
    return { resolved, failed };
  }

  // Step 3: Resolve remaining items via Music Search API with concurrency limit
  const newlyResolved: Record<string, ResolvedMetadata> = {};
  const CONCURRENCY = 3;

  for (let i = 0; i < missingFromCatalog.length; i += CONCURRENCY) {
    const slice = missingFromCatalog.slice(i, i + CONCURRENCY);
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

  // Step 4: Persist newly resolved records into the global catalog
  if (env?.CATALOG_DO && Object.keys(newlyResolved).length > 0) {
    const now = Date.now();
    const records: CanonicalTrack[] = [];
    for (const [id, item] of Object.entries(newlyResolved)) {
      records.push({
        id,
        title: item.title || "",
        author: item.author,
        authorId: item.authorId || "",
        duration: 0,
        durationStr: "",
        isSong: true,
        thumbnailId: id,
        source: "fix_metadata",
        updatedAt: now,
      });
    }
    await upsertTracks(env, records);
  }

  return { resolved, failed };
}
