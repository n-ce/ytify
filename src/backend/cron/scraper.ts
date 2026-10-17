import { YTNodes, type Innertube } from "youtubei.js";
import { getClient, formatThumbnailId, streamMapper } from "../utils.js";
import {
  slugify,
  trackItemToCanonical,
  type CanonicalTrack,
  type Category,
  type CategoryType,
  type CuratedPlaylist,
} from "../catalog.js";

/** YouTube Music "Moods & Genres" landing page. */
const MOODS_BROWSE_ID = "FEmusic_moods_and_genres";
/** Browse target a category chip resolves to; the landing page uses another one. */
const MOODS_CATEGORY_BROWSE_ID = "FEmusic_moods_and_genres_category";
const MAX_PLAYLISTS_PER_CATEGORY = 20;
const MAX_TRACKS_PER_PLAYLIST = 40;

export interface ScrapedCategory {
  playlists: CuratedPlaylist[];
  tracks: CanonicalTrack[];
}

interface ChipEndpoint {
  payload?: { browseId?: string; params?: string };
}

interface HeaderTitle {
  title?: { toString(): string };
}

interface HeaderArtwork {
  thumbnail?: { contents?: { url: string; width: number }[] };
  thumbnails?: { url: string; width: number }[];
}

function headerTitle(header?: unknown): string {
  return (header as HeaderTitle | undefined)?.title?.toString()?.trim() || "";
}

function headerArtworkId(header?: unknown): string {
  const art = header as HeaderArtwork | undefined;
  return formatThumbnailId(
    art?.thumbnail?.contents?.[0]?.url || art?.thumbnails?.[0]?.url,
  );
}

/** The landing page splits its chips into headed grids: "Moods & moments", "Genres". */
function gridType(grid: unknown): CategoryType {
  const title = headerTitle((grid as { header?: unknown }).header);
  return /genre/i.test(title) ? "genre" : "mood";
}
/**
 * Walks Explore into the Moods & Genres landing page and flattens its category
 * chips. Each grid's header is the only place the mood/genre distinction is
 * exposed, and each chip carries its own browse target, so both are kept.
 */export async function discoverCategories(): Promise<Category[]> {
  const yt = await getClient();

  const explore = await yt.music.getExplore();
  const moodsButton = explore.top_buttons.find((button) =>
    /moods/i.test(button.button_text || ""),
  );

  // The chip's payload carries the same params token a category chip carries,
  // so the landing page is reached the same way its children are.
  const params = moodsButton?.endpoint?.payload?.params;

  const page = await yt.actions.execute("/browse", {
    browseId: MOODS_BROWSE_ID,
    ...(typeof params === "string" && params ? { params } : {}),
    client: "YTMUSIC",
    parse: true,
  });

  const categories: Category[] = [];
  const seen = new Set<string>();

  const add = (
    title: string,
    endpoint: ChipEndpoint,
    type: CategoryType,
    section: string,
  ) => {
    const clean = title.trim();
    if (!clean) return;
    // A chip without a params token cannot be browsed, so it is not a category.
    const chipParams = endpoint?.payload?.params;
    if (typeof chipParams !== "string" || !chipParams) return;
    const slug = slugify(clean);
    if (seen.has(slug)) return;
    seen.add(slug);
    categories.push({
      slug,
      type,
      title: clean,
      params: chipParams,
      browseId: endpoint.payload?.browseId || MOODS_CATEGORY_BROWSE_ID,
      sectionTitle: section,
    });
  };

  for (const grid of page.contents_memo?.getType(YTNodes.Grid) || []) {
    const section = headerTitle(grid.header);
    const type: CategoryType = gridType(grid);
    for (const item of grid.contents || []) {
      if (item.is(YTNodes.MusicNavigationButton)) {
        add(item.button_text, item.endpoint, type, section);
      }
    }
  }

  // Some layouts surface chips without a wrapping grid.
  for (const chip of page.contents_memo?.getType(YTNodes.MusicNavigationButton) || []) {
    add(chip.button_text, chip.endpoint, "mood", "");
  }

  return categories;
}

async function fetchPlaylist(
  yt: Innertube,
  id: string,
): Promise<{ title: string; thumbnailId: string; tracks: CanonicalTrack[] } | null> {
  try {
    const playlist = await yt.music.getPlaylist(id);
    const items = (playlist.items || []).filter((item) =>
      item.is(YTNodes.MusicResponsiveListItem),
    );

    const tracks = items
      .slice(0, MAX_TRACKS_PER_PLAYLIST)
      .map((item) => streamMapper(item))
      .map((track) =>
        track ? trackItemToCanonical(track, "innertube_scrape") : null,
      )
      .filter((track): track is CanonicalTrack => track !== null);

    if (tracks.length === 0) return null;

    return {
      title: headerTitle(playlist.header),
      thumbnailId: headerArtworkId(playlist.header),
      tracks,
    };
  } catch (err) {
    console.warn(`[scraper] Playlist ${id} failed:`, err);
    return null;
  }
}

/**
 * Scrapes one category page into curated playlists plus the canonical tracks
 * they reference. Every failure is contained to a single playlist so one bad
 * reference cannot fail the whole category job.
 */
export async function scrapeCategory(category: Category): Promise<ScrapedCategory> {
  const yt = await getClient();

  // Browsing the landing page's id with a category's params silently returns the
  // landing page again, so the chip's own browse target is what matters.
  const page = await yt.actions.execute("/browse", {
    browseId: category.browseId || MOODS_CATEGORY_BROWSE_ID,
    params: category.params,
    client: "YTMUSIC",
    parse: true,
  });

  const memo = page.contents_memo;
  const playlistIds: string[] = [];
  const pushId = (id?: string) => {
    if (id && !playlistIds.includes(id)) playlistIds.push(id);
  };

  // A category page is a wall of playlist tiles.
  for (const item of memo?.getType(YTNodes.MusicTwoRowItem) || []) {
    if (item.item_type && item.item_type !== "playlist") continue;
    pushId(item.id || item.endpoint?.payload?.playlistId);
  }

  // Older layouts render the same tiles as responsive list items.
  for (const item of memo?.getType(YTNodes.MusicResponsiveListItem) || []) {
    if (
      item.item_type &&
      item.item_type !== "playlist" &&
      !item.endpoint?.payload?.playlistId
    ) {
      continue;
    }
    pushId(item.id || item.endpoint?.payload?.playlistId);
  }

  const playlists: CuratedPlaylist[] = [];
  const tracks: CanonicalTrack[] = [];
  const seenTracks = new Set<string>();
  const now = Date.now();
  const sectionTitle = category.sectionTitle || category.type;

  for (const id of playlistIds.slice(0, MAX_PLAYLISTS_PER_CATEGORY)) {
    const playlist = await fetchPlaylist(yt, id);
    if (!playlist) continue;

    playlists.push({
      id,
      categorySlug: category.slug,
      categoryType: category.type,
      sectionTitle,
      title: playlist.title || "Unknown Playlist",
      thumbnailId: playlist.thumbnailId,
      trackIds: playlist.tracks.map((track) => track.id),
      updatedAt: now,
    });

    for (const track of playlist.tracks) {
      if (!seenTracks.has(track.id)) {
        seenTracks.add(track.id);
        tracks.push(track);
      }
    }
  }

  return { playlists, tracks };
}
