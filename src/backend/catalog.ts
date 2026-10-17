import { parseDuration } from "../lib/utils/core.js";

/** Where a canonical record came from; later writes win over earlier ones. */
export type CanonicalSource =
  | "innertube_scrape"
  | "user_sync"
  | "fix_metadata"
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
  /** Bare 11-char video id; empty for non-song art. */
  thumbnailId: string;
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
}

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

/** The "Artist - Topic" suffix is the only reliable song signal on a library row. */
function looksLikeSong(track: CatalogTrackInput): boolean {
  if (track.type) return track.type === "song";
  return / - Topic$/i.test(track.author || "");
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
  return {
    id: track.id,
    title: track.title || "Unknown",
    author: track.author || "Unknown",
    authorId: track.authorId || "",
    duration,
    durationStr: track.duration || "",
    isSong: looksLikeSong(track),
    thumbnailId: track.img || track.id,
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
