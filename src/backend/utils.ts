import { Innertube, YTNodes, type Helpers } from "youtubei.js";

interface ICache {
  cache_dir: string;
  get(key: string): Promise<ArrayBuffer | undefined>;
  set(key: string, value: ArrayBuffer): Promise<void>;
  remove(key: string): Promise<void>;
}

class MemoryCache implements ICache {
  private store = new Map<string, ArrayBuffer>();
  cache_dir = "memory";

  async get(key: string): Promise<ArrayBuffer | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: ArrayBuffer): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }
}

let youtube: Innertube | null = null;

export async function getClient(): Promise<Innertube> {
  if (!youtube)
    youtube = await Innertube.create({
      cache: new MemoryCache(),
      generate_session_locally: true,
      retrieve_player: false,
      fetch: fetch.bind(globalThis),
    });

  return youtube;
}

// Avatars are served from interchangeable hosts (yt3/lh3.googleusercontent.com,
// yt3.ggpht.com) but each avatar lives in a mandatory path bucket, e.g. "/ytc/",
// "/a-/a/". Dropping the bucket yields a 404, so only the host is discarded.
const AVATAR_HOST = /(^|\.)(googleusercontent\.com|ggpht\.com)$/;

export function getThumbnailId(url?: string): string {
  if (!url) return "";

  const fullUrl = url.startsWith("//") ? `https:${url}` : url;

  // Video thumbnails live under /vi/<id>/ and are rebuilt by the client as such.
  if (fullUrl.includes("/vi/")) {
    return fullUrl.split("/vi/")[1]?.split("/")[0] || "";
  }

  try {
    const urlObj = new URL(fullUrl);

    // Placeholder art (e.g. www.gstatic.com/.../ytm/images/) is not resolvable.
    if (!AVATAR_HOST.test(urlObj.hostname)) return "";

    const segments = urlObj.pathname.split("/").filter(Boolean); // Remove empty strings
    const id = segments.pop()?.split("=")[0] || ""; // Strip sizing params (=w544 etc)
    if (!id) return "";

    return segments.length ? "/" + [...segments, id].join("/") : id;
  } catch (e) {
    return fullUrl.split("/").pop()?.split("=")[0] || "";
  }
}

// Single normalizer for the `img` field the client re-expands: bare 11-char video
// id, otherwise a "/"-prefixed avatar path with its bucket intact.
export function formatThumbnailId(rawUrl?: string): string {
  if (!rawUrl) return "";
  const id = getThumbnailId(rawUrl);
  if (!id || id.includes("maxresdefault")) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
  return id.startsWith("/") ? id : "/" + id;
}

/**
 * Computes the 2-digit lowercase hex shard name from the first character of an entity ID.
 * Matches Moods-And-Genres-Dataset partitioning (e.g. '-' -> '2d', '0' -> '30', 'A' -> '41', 'a' -> '61').
 */
export function getShardName(id?: string): string {
  if (!id) return "00";
  return id.charCodeAt(0).toString(16).toLowerCase();
}

export function formatDuration(durationText?: string): string {
  if (durationText?.length === 4) durationText = "0" + durationText;
  return durationText || "00:00";
}

export function formatTopicAuthor(rawAuthor?: string): string {
  if (!rawAuthor) return "Unknown";
  if (rawAuthor.endsWith(" - Topic")) return rawAuthor;
  if (rawAuthor.endsWith("- Topic"))
    return rawAuthor.replace(/- Topic$/, " - Topic");
  return `${rawAuthor} - Topic`;
}

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

export function stripTopic(author?: string): string {
  if (!author) return "";
  return author.replace(/\s*-\s*Topic$/i, "").trim();
}

export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

export function convertSStoHHMMSS(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return "00:00";
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = Math.floor(seconds % 60);
  const mmStr = mm < 10 ? "0" + mm : String(mm);
  const ssStr = ss < 10 ? "0" + ss : String(ss);
  return (hh > 0 ? `${hh}:` : "") + `${mmStr}:${ssStr}`;
}

export function parsePublished(text: string): number {
  if (!text) return 0;
  const now = Date.now();
  const match = text.match(
    /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/,
  );
  if (!match) return 0;
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };
  return now - value * multipliers[unit];
}

export function getThumbnail(
  thumbnails: { url: string; width: number }[],
): string {
  if (!thumbnails || thumbnails.length === 0) return "";
  return (
    thumbnails.sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || ""
  );
}

export function getVideoId(song: YTNodes.MusicResponsiveListItem): string {
  return (
    song.id ||
    (song.overlay?.content?.is(YTNodes.MusicPlayButton)
      ? (song.overlay.content as any).endpoint?.payload?.videoId
      : undefined) ||
    ""
  );
}

/**
 * Extract views / published / duration / author / authorId from the modern LockupView layout.
 *
 * In youtubei.js 18.2.0+, LockupView metadata structure changed:
 * - lockup.duration.seconds and lockup.duration.text provide native duration.
 * - metadata.metadata.metadata_rows contains metadata badges and text runs.
 */
export function getLockupMeta(lockup: YTNodes.LockupView): {
  views: string;
  published: string;
  duration: string;
  durationSeconds?: number;
  author: string;
  authorId: string;
} {
  const metadata = lockup.metadata as any;
  const rows =
    metadata?.metadata?.metadata_rows ||
    metadata?.metadata?.rows ||
    metadata?.metadata_rows ||
    metadata?.rows ||
    [];

  let views = "";
  let published = "";
  let duration = "";
  let durationSeconds: number | undefined;
  let author = "";
  let authorId = "";

  // 1. Author and channel ID from author run
  for (const row of rows) {
    if (row.metadata_parts) {
      for (const part of row.metadata_parts) {
        const browseRun = part?.text?.runs?.find(
          (run: any) =>
            run.endpoint?.payload?.browseId?.startsWith("UC") ||
            run.endpoint?.metadata?.api_url?.includes("browse"),
        );
        if (browseRun && !author) {
          author = browseRun.text || "";
          authorId = browseRun.endpoint?.payload?.browseId || "";
        }
      }
    }
  }

  // 2. Views and published date from subsequent metadata parts
  for (const row of rows) {
    if (row.metadata_parts) {
      for (const part of row.metadata_parts) {
        const text = part?.text?.toString() || "";
        if (text.includes("view")) {
          views = text.split("view")[0].trim() + " views";
        } else if (text.includes("ago")) {
          published = text;
        }
      }
    }
  }

  // 3. Duration: youtubei.js 18.2.0 natively exposes duration on LockupView
  if (lockup.duration) {
    duration = lockup.duration.text || "";
    durationSeconds = lockup.duration.seconds;
  }

  // Fallback to overlay badge if duration wasn't on LockupView directly
  if (!duration) {
    const badge = (lockup.content_image as any)?.primary_thumbnail?.overlays
      ?.find((o: any) => o.is?.(YTNodes.ThumbnailOverlayBadgeView))
      ?.as?.(YTNodes.ThumbnailOverlayBadgeView)?.badges?.[0]?.text;
    if (badge && /^\d+:\d+/.test(badge)) {
      duration = badge;
    }
  }

  if (duration && !durationSeconds) {
    const parts = duration.split(":").map(Number);
    if (parts.length === 3)
      durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) durationSeconds = parts[0] * 60 + parts[1];
  }

  return { views, published, duration, durationSeconds, author, authorId };
}

export function streamMapper(node: Helpers.YTNode): YTItem | null {
  if (node.is(YTNodes.Video)) {
    const video = node.as(YTNodes.Video);

    // Filter out Shorts (videos < 90 seconds)
    if (video.duration?.seconds && video.duration.seconds < 90) return null;

    let subtext = "";
    if (video.view_count?.toString()) {
      subtext = video.view_count.toString();
      if (video.published?.toString()) {
        subtext += " • " + video.published.toString();
      }
    }

    return {
      id: video.id,
      title: video.title?.toString() || "Unknown",
      duration: formatDuration(video.duration?.text),
      author: video.author?.name || "Unknown",
      authorId: video.author?.id || (video.author as any)?.channel_id || "",
      subtext,
      type: "video",
    };
  }

  if (node.is(YTNodes.LockupView)) {
    const lockup = node.as(YTNodes.LockupView);
    if (!lockup.content_id) return null;

    // Only process VIDEO content type
    if (lockup.content_type && lockup.content_type !== "VIDEO") return null;

    const meta = getLockupMeta(lockup);

    // Filter out Shorts (< 90 seconds)
    if (meta.durationSeconds && meta.durationSeconds < 90) return null;

    let subtext = "";
    if (meta.views) {
      subtext = meta.views;
      if (meta.published) {
        subtext += " • " + meta.published;
      }
    }

    return {
      id: lockup.content_id,
      title: lockup.metadata?.title?.toString() || "Unknown",
      duration: formatDuration(meta.duration),
      author: meta.author || "Unknown",
      authorId: meta.authorId || "",
      subtext,
      type: "video",
    };
  }

  if (node.is(YTNodes.MusicResponsiveListItem)) {
    const song = node.as(YTNodes.MusicResponsiveListItem);

    let albumId: string | undefined;
    let albumTitle: string | undefined;

    const album = song.album;
    if (album?.name) {
      albumId = album.id;
      albumTitle = album.name;
    }

    if (!albumId) {
      const albumItem = song.menu?.items?.find((i: any) =>
        i.endpoint?.payload?.browseId?.startsWith("MPRE"),
      );
      if (albumItem) {
        albumId = (albumItem as any).endpoint.payload.browseId;
        albumTitle = (albumItem as any).text?.toString();
      }
    }

    let artistName = "";
    let artistId = "";
    let flexAlbumTitle = "";
    let flexAlbumId = "";
    let flexDuration = "";

    if (
      song.artists?.length &&
      song.artists[0]?.name &&
      !isCorruptedArtist(song.artists[0].name)
    ) {
      artistName = song.artists
        .map((a: any) => a.name)
        .filter(Boolean)
        .join(", ");
      artistId = song.artists[0]?.channel_id || "";
    } else if (
      (song as any).authors?.length &&
      (song as any).authors[0]?.name &&
      !isCorruptedArtist((song as any).authors[0].name)
    ) {
      artistName = (song as any).authors
        .map((a: any) => a.name)
        .filter(Boolean)
        .join(", ");
      artistId = (song as any).authors[0]?.channel_id || "";
    } else if (song.author?.name && !isCorruptedArtist(song.author.name)) {
      artistName = song.author.name;
      artistId =
        (song.author as any).channel_id || (song.author as any).id || "";
    }

    const flexRuns =
      song.flex_columns?.[1]?.title?.runs || song.subtitle?.runs || [];
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
          if (!artistId && r.endpoint?.payload?.browseId?.startsWith("UC")) {
            artistId = r.endpoint.payload.browseId;
          }
        } else {
          const trimmed = text.trim();
          if (/^\d+:\d+(?::\d+)?$/.test(trimmed)) {
            flexDuration = trimmed;
          } else if (r.endpoint?.payload?.browseId?.startsWith("MPRE")) {
            flexAlbumTitle = trimmed;
            flexAlbumId = r.endpoint.payload.browseId;
          }
        }
      }
      if (!artistName && artistRuns.length > 0) {
        const joined = artistRuns.join("").trim();
        if (!isCorruptedArtist(joined)) {
          artistName = joined;
        }
      }
    }

    if (!artistId && song.menu?.items) {
      for (const m of song.menu.items as any[]) {
        const browseId = m.endpoint?.payload?.browseId;
        if (browseId?.startsWith("UC")) {
          artistId = browseId;
          break;
        }
      }
    }

    if (!albumId && flexAlbumId) {
      albumId = flexAlbumId;
      albumTitle = albumTitle || flexAlbumTitle;
    }

    const duration =
      song.duration?.text ||
      flexDuration ||
      song.subtitle?.runs
        ?.find((r: any) => r.text && /^\d+:\d+$/.test(r.text.trim()))
        ?.text?.trim();

    let subtext = "";
    if (albumTitle) {
      subtext = albumTitle;
      const views = song.views?.toString();
      if (views) {
        subtext += " • " + views;
      }
    }

    return {
      id: getVideoId(song),
      title:
        song.title?.toString() ||
        song.flex_columns?.[0]?.title?.toString() ||
        "Unknown",
      duration: formatDuration(duration),
      author: formatTopicAuthor(artistName),
      authorId: artistId,
      albumId,
      albumTitle,
      img: formatThumbnailId(song.thumbnail?.contents?.[0]?.url),
      subtext,
      type: "song",
    };
  }

  return null;
}

export function listMapper(node: Helpers.YTNode): YTListItem | null {
  if (node.is(YTNodes.LockupView)) {
    const lockup = node.as(YTNodes.LockupView);
    if (!lockup.content_id) return null;

    if (lockup.content_id.startsWith("RD")) return null;

    // 18.1.0+: LockupView can have content_type "PLAYLIST", "COLLECTION", "SHOW", or "VIDEO"
    if (
      lockup.content_type === "PLAYLIST" ||
      (lockup.content_type as string) === "COLLECTION" ||
      lockup.content_type === "SHOW"
    ) {
      const metadata = lockup.metadata as any;
      const contentImage = lockup.content_image as any;
      const thumbUrl = contentImage?.primary_thumbnail?.image?.[0]?.url || "";
      const videoCountBadge =
        contentImage?.primary_thumbnail?.overlays
          ?.find((o: any) => o.is?.(YTNodes.ThumbnailOverlayBadgeView))
          ?.as?.(YTNodes.ThumbnailOverlayBadgeView)?.badges?.[0]?.text ||
        "0 videos";

      return {
        id: lockup.content_id,
        name: metadata?.title?.toString() || "Unknown Playlist",
        videoCount: videoCountBadge,
        img: formatThumbnailId(thumbUrl),
        type: "playlist",
      };
    }
  }

  if (node.is(YTNodes.Playlist)) {
    const playlist = node.as(YTNodes.Playlist);

    if (playlist.id?.startsWith("RD")) return null;

    return {
      id: playlist.id,
      name: playlist.title?.toString() || "Unknown",
      videoCount: playlist.video_count?.toString() || "0 videos",
      img: formatThumbnailId(playlist.thumbnails?.[0]?.url),
      type: "playlist",
    };
  }

  if (node.is(YTNodes.Channel)) {
    const channel = node.as(YTNodes.Channel);
    const description =
      channel.description_snippet?.text ||
      channel.description_snippet?.runs?.map((r) => r.text).join("") ||
      "";

    let subscribers = channel.subscriber_count?.toString() || "";
    let videoCount = channel.video_count?.toString() || "";

    if (videoCount.toLowerCase().includes("subscriber")) {
      const actualSubscribers = videoCount;
      videoCount = subscribers.toLowerCase().includes("video")
        ? subscribers
        : "";
      subscribers = actualSubscribers;
    } else if (subscribers.toLowerCase().includes("video") && !videoCount) {
      videoCount = subscribers;
      subscribers = "";
    } else if (subscribers.startsWith("@")) {
      subscribers = "";
    }

    return {
      id: channel.id,
      name: channel.author?.name || "Unknown",
      subscribers: subscribers || "0 subscribers",
      img: formatThumbnailId(channel.author?.thumbnails?.[0]?.url),
      description: description,
      videoCount: videoCount,
      type: "channel",
    };
  }

  if (node.is(YTNodes.MusicResponsiveListItem)) {
    const item = node.as(YTNodes.MusicResponsiveListItem);
    const type = item.item_type?.toLowerCase();

    if (type === "artist") {
      const subscribers =
        item.subscribers ||
        item.subtitle?.runs?.find(
          (r: any) => r.text && r.text.includes("subscribers"),
        )?.text ||
        "";
      return {
        id: item.id || "",
        name: item.name || "Unknown",
        subscribers: subscribers,
        img: formatThumbnailId(item.thumbnail?.contents?.[0]?.url),
        type: "artist",
      };
    }

    if (type === "album") {
      const pId =
        (item.overlay?.content?.is(YTNodes.MusicItemThumbnailOverlay)
          ? (item.overlay.content as any).endpoint?.payload?.playlistId
          : undefined) ||
        item.menu?.items
          ?.find(
            (i: any) =>
              i.is(YTNodes.MenuNavigationItem) &&
              i
                .as(YTNodes.MenuNavigationItem)
                .endpoint?.payload?.playlistId?.startsWith("OLAK"),
          )
          ?.as(YTNodes.MenuNavigationItem).endpoint?.payload?.playlistId ||
        "";
      const artistName =
        item.author?.name ||
        item.artists?.[0]?.name ||
        item.subtitle?.runs?.find((r: any) =>
          (r as any)?.endpoint?.payload?.browseId?.startsWith("UC"),
        )?.text ||
        item.flex_columns?.[1]?.title?.runs?.find((r: any) =>
          (r as any)?.endpoint?.payload?.browseId?.startsWith("UC"),
        )?.text ||
        "Unknown Artist";

      return {
        id: item.id || "",
        name: item.title || item.name || "Unknown",
        playlistId: pId,
        author: artistName,
        year:
          item.year ||
          item.subtitle?.runs?.find(
            (r: any) => r.text && /^\\d{4}$/.test(r.text),
          )?.text ||
          item.flex_columns?.[1]?.title?.runs?.find(
            (r: any) => r.text && /^\\d{4}$/.test(r.text),
          )?.text ||
          "",
        img: formatThumbnailId(item.thumbnail?.contents?.[0]?.url),
        type: "album",
      };
    }
  }

  return null;
}
