import { YTNodes, type Innertube } from "youtubei.js";
import { getClient, getThumbnail, formatThumbnailId } from "./utils.js";

export type FeaturedArtist = Channel & { type: "artist" };

/** The Featured shelf shows at most this many playlists. */
const FEATURED_PLAYLIST_LIMIT = 10;

export interface FeaturedResult {
  featuredPlaylists: YTPlaylistItem[];
  artists: FeaturedArtist[];
}

interface FetchArtistResult {
  artist: FeaturedArtist | null;
  featuredOnPlaylists: YTPlaylistItem[];
}

async function fetchArtistData(
  yt: Innertube,
  id: string,
): Promise<FetchArtistResult> {
  try {
    const artist = await yt.music.getArtist(id);
    let name = "";
    let thumbnails: { url: string; width: number; height: number }[] = [];

    const header = artist.header as any;
    if (header?.is(YTNodes.MusicImmersiveHeader)) {
      const h = header.as(YTNodes.MusicImmersiveHeader);
      name = h.title?.text || h.title?.toString() || "";
      thumbnails = h.thumbnail?.contents || [];
    } else if (header?.is(YTNodes.MusicVisualHeader)) {
      const h = header.as(YTNodes.MusicVisualHeader);
      name = h.title?.text || h.title?.toString() || "";
      thumbnails = h.thumbnail || [];
    } else if (header?.is(YTNodes.MusicHeader)) {
      const h = header.as(YTNodes.MusicHeader);
      name = h.title?.text || h.title?.toString() || "";
      thumbnails = h.thumbnails || [];
    } else if (header) {
      name = header.title?.text || header.title?.toString() || "";
      thumbnails =
        header.thumbnail?.contents ||
        header.thumbnails ||
        (Array.isArray(header.thumbnail) ? header.thumbnail : []);
    }

    const artistChannel: FeaturedArtist = {
      id,
      name,
      img: formatThumbnailId(getThumbnail(thumbnails)),
      type: "artist",
    };

    const playlistsSection = artist.sections?.find((section) => {
      if (!section.is(YTNodes.MusicCarouselShelf)) return false;
      const h = section.header;
      if (h?.is(YTNodes.MusicCarouselShelfBasicHeader)) {
        const title = h.title?.toString() || "";
        return (
          title === "Featured on" || title.toLowerCase().includes("featured")
        );
      }
      return false;
    }) as YTNodes.MusicCarouselShelf | undefined;

    const featuredOnPlaylists: YTPlaylistItem[] = (
      playlistsSection?.contents || []
    )
      .map((item): YTPlaylistItem | null => {
        if (item.is(YTNodes.MusicTwoRowItem)) {
          const musicItem = item.as(YTNodes.MusicTwoRowItem);
          const rawThumbs = Array.isArray(musicItem.thumbnail)
            ? musicItem.thumbnail
            : (musicItem.thumbnail as any)?.contents || [];
          let author =
            musicItem.subtitle?.toString() || name || "YouTube Music";
          if (author.trim().toLowerCase() === "playlist • youtube music") {
            author = "";
          }
          return {
            id: musicItem.id || "",
            name: musicItem.title?.toString() || "",
            img: formatThumbnailId(getThumbnail(rawThumbs)),
            author,
            type: "playlist",
          };
        }
        return null;
      })
      .filter((i): i is YTPlaylistItem => i !== null && !!i.id);

    return {
      artist: artistChannel,
      featuredOnPlaylists,
    };
  } catch (e) {
    console.error(`Failed to fetch artist ${id}`, e);
    return { artist: null, featuredOnPlaylists: [] };
  }
}

export default async function getFeatured(
  artistIdsOrEnv: string[] | any,
  limitOrArtistIds?: number | string[],
  maybeLimit = 20,
): Promise<FeaturedResult> {
  const artistIds: string[] = Array.isArray(artistIdsOrEnv)
    ? artistIdsOrEnv
    : Array.isArray(limitOrArtistIds)
      ? limitOrArtistIds
      : [];
  const limit: number =
    typeof limitOrArtistIds === "number"
      ? limitOrArtistIds
      : typeof maybeLimit === "number"
        ? maybeLimit
        : 20;

  if (artistIds.length === 0) {
    return {
      featuredPlaylists: [],
      artists: [],
    };
  }

  const yt = await getClient();
  // Resolve in small sequential batches. A burst of parallel `music.getArtist`
  // calls can get some of them dropped/rate-limited, which used to leave the
  // favorites shelf with only the couple of artists that got through.
  const ARTIST_BATCH_SIZE = 5;
  const artistResults: FetchArtistResult[] = [];
  for (let i = 0; i < artistIds.length; i += ARTIST_BATCH_SIZE) {
    const batch = artistIds.slice(i, i + ARTIST_BATCH_SIZE);
    artistResults.push(
      ...(await Promise.all(batch.map((id) => fetchArtistData(yt, id)))),
    );
  }

  // 1. Extract artists with real avatars for Favorites shelf
  const artists: FeaturedArtist[] = artistResults
    .map((r) => r.artist)
    .filter((a): a is FeaturedArtist => a !== null && !!a.id && !!a.name);

  // 2. Aggregate every artist's "Featured on" playlists, counting how many of
  //    the passed artists feature each one. `order` is the index of the first
  //    artist (in request order) that features the playlist; it is used to
  //    restore the caller's artist order after the count-based selection.
  const playlistCounts = new Map<
    string,
    { playlist: YTPlaylistItem; count: number; order: number }
  >();

  artistResults.forEach((r, artistIndex) => {
    for (const playlist of r.featuredOnPlaylists) {
      if (!playlist.id) continue;
      const existing = playlistCounts.get(playlist.id);
      if (existing) existing.count++;
      else
        playlistCounts.set(playlist.id, {
          playlist,
          count: 1,
          order: artistIndex,
        });
    }
  });

  // 3. Pick the 10 most-shared playlists, then display them in the order the
  //    caller passed the artists: a playlist belongs where the first of its
  //    artists sits in `artistIds`.
  const featuredPlaylists = [...playlistCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, FEATURED_PLAYLIST_LIMIT)
    .sort((a, b) => a.order - b.order)
    .map(({ playlist }) => playlist);

  return {
    featuredPlaylists,
    artists: artists.slice(0, limit),
  };
}
