import { YTNodes } from "youtubei.js";
import {
  getClient,
  getVideoId,
  formatThumbnailId,
  formatTopicAuthor,
  isCorruptedArtist,
} from "./utils.js";

export interface ResolvedSongData {
  author: string;
  authorId: string;
  title: string;
  albumId?: string;
  albumTitle?: string;
  thumbnailId?: string;
  matchedSongId?: string;
}

const fastCache = new Map<string, ResolvedSongData>();

export function isSquareThumbnail(id?: string): boolean {
  if (!id) return false;
  if (/^[a-zA-Z0-9_-]{11}$/.test(id) || /^\/[a-zA-Z0-9_-]{11}$/.test(id))
    return false;
  if (id.startsWith("/vi/") || id.startsWith("/vi_webp/")) return false;
  return id.startsWith("/");
}

/**
 * Extracts and normalizes metadata from a YouTube Music search song item.
 */
function extractSongMetadata(
  item: YTNodes.MusicResponsiveListItem,
  targetId: string,
): ResolvedSongData | null {
  const cleanTitle =
    item.title?.toString() || item.flex_columns?.[0]?.title?.toString() || "";

  let rawArtist = "";
  let authorId = "";

  if (
    item.artists?.length &&
    item.artists[0]?.name &&
    !isCorruptedArtist(item.artists[0].name)
  ) {
    rawArtist = item.artists
      .map((a: any) => a.name)
      .filter(Boolean)
      .join(", ");
    authorId = item.artists[0]?.channel_id || "";
  } else if (
    (item as any).authors?.length &&
    (item as any).authors[0]?.name &&
    !isCorruptedArtist((item as any).authors[0].name)
  ) {
    rawArtist = (item as any).authors
      .map((a: any) => a.name)
      .filter(Boolean)
      .join(", ");
    authorId = (item as any).authors[0]?.channel_id || "";
  } else if (item.author?.name && !isCorruptedArtist(item.author.name)) {
    rawArtist = item.author.name;
    authorId = (item.author as any).channel_id || (item.author as any).id || "";
  }

  const flexRuns =
    item.flex_columns?.[1]?.title?.runs || item.subtitle?.runs || [];
  let flexAlbumTitle = "";
  let flexAlbumId = "";

  if (flexRuns.length > 0) {
    const artistRuns: string[] = [];
    let bulletIndex = 0;
    for (const r of flexRuns as any[]) {
      const text = r.text || "";
      if (text === " • ") {
        bulletIndex++;
        continue;
      }
      if (bulletIndex === 0) {
        artistRuns.push(text);
        if (!authorId && r.endpoint?.payload?.browseId?.startsWith("UC")) {
          authorId = r.endpoint.payload.browseId;
        }
      } else {
        const trimmed = text.trim();
        if (r.endpoint?.payload?.browseId?.startsWith("MPRE")) {
          flexAlbumTitle = trimmed;
          flexAlbumId = r.endpoint.payload.browseId;
        }
      }
    }
    if (!rawArtist && artistRuns.length > 0) {
      const joined = artistRuns.join("").trim();
      if (!isCorruptedArtist(joined)) {
        rawArtist = joined;
      }
    }
  }

  if (!authorId && item.menu?.items) {
    for (const m of item.menu.items as any[]) {
      const browseId = m.endpoint?.payload?.browseId;
      if (browseId?.startsWith("UC")) {
        authorId = browseId;
        break;
      }
    }
  }

  if (!rawArtist || isCorruptedArtist(rawArtist)) return null;

  const author = formatTopicAuthor(rawArtist);

  // Album resolution
  let albumId = item.album?.id || flexAlbumId;
  let albumTitle = item.album?.name || flexAlbumTitle;

  if (!albumId && item.menu?.items) {
    const albumItem = item.menu.items.find(
      (i: any) =>
        i.endpoint?.payload?.playlistId?.startsWith("OLAK") ||
        i.endpoint?.payload?.browseId?.startsWith("MPRE"),
    );
    if (albumItem) {
      albumId =
        (albumItem as any).endpoint.payload.playlistId ||
        (albumItem as any).endpoint.payload.browseId;
      albumTitle = albumTitle || (albumItem as any).text?.toString();
    }
  }

  const rawThumb = formatThumbnailId(item.thumbnail?.contents?.[0]?.url);
  const thumbnailId = isSquareThumbnail(rawThumb) ? rawThumb : undefined;
  const matchedSongId = getVideoId(item) || targetId;

  return {
    author,
    authorId,
    title: cleanTitle,
    albumId: albumId || undefined,
    albumTitle: albumTitle || undefined,
    thumbnailId,
    matchedSongId,
  };
}

/**
 * Resolves metadata specifically for a song by ID using YouTube Music song search.
 */
export async function resolveSongData(
  id: string,
): Promise<ResolvedSongData | null> {
  if (!id) return null;

  try {
    const yt = await getClient();
    const results = await yt.music.search(id, { type: "song" });
    const contents = results.songs?.contents || [];
    if (contents.length === 0) return null;

    let matchedSong: YTNodes.MusicResponsiveListItem | null = null;

    for (const node of contents) {
      if (node.is(YTNodes.MusicResponsiveListItem)) {
        const item = node.as(YTNodes.MusicResponsiveListItem);
        const vid = getVideoId(item);
        if (vid && vid === id) {
          matchedSong = item;
          break;
        }
      }
    }

    if (!matchedSong && contents[0].is(YTNodes.MusicResponsiveListItem)) {
      matchedSong = contents[0].as(YTNodes.MusicResponsiveListItem);
    }

    if (matchedSong) {
      return extractSongMetadata(matchedSong, id);
    }

    return null;
  } catch (err) {
    console.error(`[getSongData] Error searching music for ${id}:`, err);
    return null;
  }
}

/**
 * Batch-resolves song data for IDs.
 */
export async function getSongData(
  ids: string[] | string,
): Promise<{ resolved: Record<string, ResolvedSongData>; failed: string[] }> {
  const idList: string[] = typeof ids === "string" ? [ids] : ids;

  const resolved: Record<string, ResolvedSongData> = {};
  const failed: string[] = [];
  const missingFromMemory: string[] = [];

  // Step 1: Check fast in-memory cache
  for (const id of idList) {
    if (id && fastCache.has(id)) {
      resolved[id] = fastCache.get(id)!;
    } else if (id) {
      missingFromMemory.push(id);
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
      slice.map(async (id) => {
        const result = await resolveSongData(id);
        if (result) {
          resolved[id] = result;
          if (fastCache.size > 5000) fastCache.clear();
          fastCache.set(id, result);
        } else {
          failed.push(id);
        }
      }),
    );
  }

  return { resolved, failed };
}

export default getSongData;
