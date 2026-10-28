import { YTNodes } from "youtubei.js";
import {
  getClient,
  getVideoId,
  formatThumbnailId,
  formatTopicAuthor,
} from "./utils.js";

export interface FixTarget {
  id: string;
  title: string;
  author?: string;
  isTopic?: boolean;
}

export interface ResolvedMetadata {
  author: string;
  authorId: string;
  title: string;
  albumId?: string;
  albumTitle?: string;
  thumbnailId?: string;
  matchedSongId?: string;
}

const fastCache = new Map<string, ResolvedMetadata>();

/**
 * Strips common clutter from song titles to increase search precision.
 */
function cleanSearchTitle(title: string): string {
  if (!title) return "";
  const clean = title
    .replace(
      /\s*[\(\[](?:official\s+)?(?:music\s+)?(?:audio|video|lyric\s+video|visualizer|hd|hq|extended|clean|explicit|remaster(?:ed)?)[^\)\]]*[\)\]]/gi,
      "",
    )
    .replace(/\.(mp3|opus|m4a|wav|flac)$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return clean || title;
}

/**
 * Checks if an author string is a placeholder/corrupted "Release - Topic" or unknown artist.
 */
export function isCorruptedArtist(name?: string): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return (
    n === "release - topic" ||
    n === "release-topic" ||
    n === "release" ||
    n === "various artists - topic" ||
    n === "various artists" ||
    n === "unknown artist" ||
    n === "unknown" ||
    n === ""
  );
}

/**
 * Determines whether a target is a 'topic' music release requiring the songs search filter.
 */
export function isTopicTrack(target: FixTarget): boolean {
  if (target.isTopic) return true;
  const author = (target.author || "").trim().toLowerCase();
  if (!author || isCorruptedArtist(author) || author.includes("topic")) {
    return true;
  }
  const title = (target.title || "").toLowerCase();
  if (title.includes("topic")) {
    return true;
  }
  return false;
}

/**
 * Determines whether a thumbnail identifier represents a square cover art ID.
 */
export function isSquareThumbnail(id?: string): boolean {
  if (!id) return false;
  if (/^[a-zA-Z0-9_-]{11}$/.test(id) || /^\/[a-zA-Z0-9_-]{11}$/.test(id))
    return false;
  if (id.startsWith("/vi/") || id.startsWith("/vi_webp/")) return false;
  return id.startsWith("/");
}

function normalizeForMatching(text?: string): string {
  if (!text) return "";
  return cleanSearchTitle(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titlesMatch(a?: string, b?: string): boolean {
  const normA = normalizeForMatching(a);
  const normB = normalizeForMatching(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.length >= 4 && normB.includes(normA)) return true;
  if (normB.length >= 4 && normA.includes(normB)) return true;
  return false;
}

/**
 * Resolves metadata using YouTube search with title and ID matching.
 * 'topic' tracks MUST use the YouTube Music songs search filter ({ type: 'song' }).
 */
export async function resolveTrackMetadataViaSearch(
  target: FixTarget,
): Promise<ResolvedMetadata | null> {
  if (!target.id && !target.title) return null;

  try {
    const yt = await getClient();
    const query = cleanSearchTitle(target.title) || target.id;
    if (!query) return null;

    const isTopic = isTopicTrack(target);

    if (isTopic) {
      // 'topic' tracks MUST use the songs search filter
      const results = await yt.music.search(query, { type: "song" });
      const contents = results.songs?.contents || [];
      if (contents.length === 0) return null;

      let matchedSong: YTNodes.MusicResponsiveListItem | null = null;

      // 1. Exact ID matching
      if (target.id) {
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
      }

      // 2. Title matching
      if (!matchedSong && target.title) {
        for (const node of contents) {
          if (node.is(YTNodes.MusicResponsiveListItem)) {
            const item = node.as(YTNodes.MusicResponsiveListItem);
            const artistName =
              item.artists?.[0]?.name || (item as any).authors?.[0]?.name;
            if (artistName && !isCorruptedArtist(artistName)) {
              const itemTitle = item.title?.toString() || "";
              if (titlesMatch(target.title, itemTitle)) {
                matchedSong = item;
                break;
              }
            }
          }
        }
      }

      // 3. Fallback: first result with valid artist
      if (!matchedSong) {
        for (const node of contents) {
          if (node.is(YTNodes.MusicResponsiveListItem)) {
            const item = node.as(YTNodes.MusicResponsiveListItem);
            const artistName =
              item.artists?.[0]?.name || (item as any).authors?.[0]?.name;
            if (artistName && !isCorruptedArtist(artistName)) {
              matchedSong = item;
              break;
            }
          }
        }
      }

      if (!matchedSong) return null;

      const rawArtist = (
        matchedSong.artists?.[0]?.name ||
        (matchedSong as any).authors?.[0]?.name
      )?.trim();
      if (!rawArtist || isCorruptedArtist(rawArtist)) return null;

      const authorId =
        matchedSong.artists?.[0]?.channel_id ||
        (matchedSong as any).authors?.[0]?.channel_id ||
        "";
      const cleanTitle = matchedSong.title?.toString() || target.title;
      const author = formatTopicAuthor(rawArtist);

      const playlistId =
        matchedSong.menu?.items
          ?.find(
            (i: any) =>
              i.is?.(YTNodes.MenuNavigationItem) &&
              i
                .as(YTNodes.MenuNavigationItem)
                .endpoint?.payload?.playlistId?.startsWith("OLAK"),
          )
          ?.as(YTNodes.MenuNavigationItem).endpoint?.payload?.playlistId ||
        matchedSong.album?.id ||
        "";

      const albumTitle = matchedSong.album?.name;
      const rawThumb = formatThumbnailId(
        matchedSong.thumbnail?.contents?.[0]?.url,
      );
      const thumbnailId = isSquareThumbnail(rawThumb) ? rawThumb : undefined;
      const matchedSongId = getVideoId(matchedSong) || target.id;

      return {
        author,
        authorId,
        title: cleanTitle,
        albumId: playlistId || undefined,
        albumTitle: albumTitle || undefined,
        thumbnailId,
        matchedSongId,
      };
    } else {
      // Non-topic track: search YouTube general videos
      const results = await yt.search(query, { type: "video" });
      const contents = (results.videos || results.results || []) as any[];
      if (contents.length === 0) return null;

      let matchedVideo: any = null;

      // 1. Exact ID matching
      if (target.id) {
        for (const item of contents) {
          if (item?.id === target.id) {
            matchedVideo = item;
            break;
          }
        }
      }

      // 2. Title matching
      if (!matchedVideo && target.title) {
        for (const item of contents) {
          const itemTitle = item?.title?.toString?.() || "";
          const artistName = item?.author?.name;
          if (artistName && titlesMatch(target.title, itemTitle)) {
            matchedVideo = item;
            break;
          }
        }
      }

      // 3. Fallback: first item with an author
      if (!matchedVideo) {
        matchedVideo = contents.find((c) => c?.author?.name);
      }

      if (!matchedVideo) return null;

      const author = matchedVideo.author?.name || "";
      const authorId = matchedVideo.author?.id || "";
      const title = matchedVideo.title?.toString?.() || target.title;
      const rawThumb = formatThumbnailId(
        matchedVideo.thumbnails?.[0]?.url ||
          matchedVideo.thumbnail?.contents?.[0]?.url,
      );

      return {
        author,
        authorId,
        title,
        thumbnailId: rawThumb || undefined,
        matchedSongId: matchedVideo.id || target.id,
      };
    }
  } catch (err) {
    console.error(
      `[fixMetadata] Error searching music for ${target.id} (${target.title}):`,
      err,
    );
    return null;
  }
}

/**
 * Batch-resolves metadata targets without any catalog affiliation.
 */
export async function handleFixMetadata(
  targets: FixTarget[],
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

  // Step 2: Resolve remaining items via search with concurrency limit
  const CONCURRENCY = 3;
  for (let i = 0; i < missingFromMemory.length; i += CONCURRENCY) {
    const slice = missingFromMemory.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (target) => {
        const result = await resolveTrackMetadataViaSearch(target);
        if (result && target.id) {
          resolved[target.id] = result;
          if (fastCache.size > 5000) fastCache.clear();
          fastCache.set(target.id, result);
        } else if (target.id) {
          failed.push(target.id);
        }
      }),
    );
  }

  return { resolved, failed };
}
