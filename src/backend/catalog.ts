import { parseDuration } from "../lib/utils/core.js";

/** Where a canonical record came from; later writes win over earlier ones. */
export type CanonicalSource =
  | "innertube_scrape"
  | "user_sync"
  | "fix_metadata"
  | "artist_featured"
  | "search"
  | "oembed";

export interface CanonicalTrack {
  id: string;
  title: string;
  author: string;
  authorId: string;
  /** Duration in seconds (0 when unknown). */
  duration: number;
  durationStr: string;
  isSong: boolean;
  /** Square cover art ID (starting with "/"); empty for non-song art or video thumbnails. */
  thumbnailId: string;
  albumId?: string;
  albumTitle?: string;
  /** Music video ID (OMV) if this track is an official song (ATV). */
  omvId?: string;
  /** Canonical song release ID (ATV) if this track is a music video (OMV). */
  atvId?: string;
  source: CanonicalSource;
  updatedAt: number;
}

export interface CanonicalSong {
  id: string;
  title: string;
  author: string;
  authorId: string;
  albumId?: string;
  albumTitle?: string;
  duration: number;
  durationStr: string;
  thumbnailId: string;
  /** Music video ID (OMV) corresponding to this song release. */
  omvId?: string;
  source: CanonicalSource;
  updatedAt: number;
}

export interface CanonicalVideo {
  id: string;
  title: string;
  author: string;
  authorId: string;
  duration: number;
  durationStr: string;
  /** Canonical song ID (ATV) corresponding to this music video. */
  atvId?: string;
  source: CanonicalSource;
  updatedAt: number;
}

export type CategoryType = "mood" | "genre";

/** Type alias (not an interface) so it satisfies the SQL row generic. */
export type Category = {
  slug: string;
  type: CategoryType;
  title: string;
  /** InnerTube browse params token for the category chip. */
  params: string;
  /** InnerTube browse target for the chip; differs from the landing page. */
  browseId?: string;
  /** Grid the chip was discovered in ("Moods & moments", "Genres", ...). */
  sectionTitle?: string;
};

export interface CuratedPlaylist {
  id: string;
  categorySlug: string;
  categoryType: CategoryType;
  sectionTitle: string;
  title: string;
  thumbnailId: string;
  trackIds: string[];
  updatedAt: number;
}

export interface Recommendation extends Omit<CuratedPlaylist, "trackIds"> {
  score: number;
  trackCount: number;
  tracks: CanonicalTrack[];
}

/** Input shape shared by library rows, search results and scrape items. */
export type CatalogTrackInput = Partial<TrackItem> & {
  img?: string;
  type?: "video" | "song";
  omvId?: string;
  atvId?: string;
};

/** Overlap weight per shared track, ported from the retired dataset repo. */
export const SCORE_PER_TRACK = 10;

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown"
  );
}

/** The "Artist - Topic" suffix or album info is the reliable song signal. */
export function looksLikeSong(track: CatalogTrackInput): boolean {
  if (track.type) return track.type === "song";
  if (track.albumId || track.albumTitle) return true;
  return / - Topic$/i.test(track.author || "");
}

/** Clean author name by stripping " - Topic" for song storage */
export function cleanAuthor(author?: string): string {
  if (!author) return "Unknown";
  return author.replace(/ - Topic$/i, "").trim() || "Unknown";
}

/**
 * Determines whether a thumbnail identifier represents a square cover art ID.
 * Square cover art originates from Google CDN (lh3/yt3.googleusercontent.com)
 * and starts with "/", without being an 11-character video ID or /vi/ path.
 */
export function isSquareThumbnail(id?: string): boolean {
  if (!id) return false;
  if (/^[a-zA-Z0-9_-]{11}$/.test(id) || /^\/[a-zA-Z0-9_-]{11}$/.test(id))
    return false;
  if (id.startsWith("/vi/") || id.startsWith("/vi_webp/")) return false;
  return id.startsWith("/");
}

/**
 * Projects a client-side track (library entry or search result) onto the
 * canonical schema. Returns null for ids that can never be resolved.
 */
export function trackItemToCanonical(
  track: CatalogTrackInput,
  source: CanonicalSource = "user_sync",
): CanonicalTrack | null {
  if (!track?.id) return null;
  const duration = parseDuration(track.duration || "");
  const isSong = looksLikeSong(track);
  return {
    id: track.id,
    title: track.title || "Unknown",
    author: track.author || "Unknown",
    authorId: track.authorId || "",
    duration,
    durationStr: track.duration || "",
    isSong,
    thumbnailId: isSong && isSquareThumbnail(track.img) ? track.img! : "",
    albumId: track.albumId || undefined,
    albumTitle: track.albumTitle || undefined,
    omvId: track.omvId || undefined,
    atvId: track.atvId || undefined,
    source,
    updatedAt: typeof track.modified === "number" ? track.modified : Date.now(),
  };
}

export function tracksToCanonical(
  tracks: CatalogTrackInput[],
  source: CanonicalSource = "user_sync",
): CanonicalTrack[] {
  const out: CanonicalTrack[] = [];
  const seen = new Set<string>();
  for (const track of tracks) {
    const canonical = trackItemToCanonical(track, source);
    if (canonical && !seen.has(canonical.id)) {
      seen.add(canonical.id);
      out.push(canonical);
    }
  }
  return out;
}
