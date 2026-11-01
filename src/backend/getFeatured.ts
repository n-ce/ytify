import { YTNodes, type Innertube } from "youtubei.js";
import { getClient, getThumbnail, formatThumbnailId } from "./utils.js";

export type FeaturedArtist = Channel & { type: "artist" };

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
  const artistResults: FetchArtistResult[] = await Promise.all(
    artistIds.map((id) => fetchArtistData(yt, id)),
  );

  // 1. Extract artists with real avatars for Favorites shelf
  const artists: FeaturedArtist[] = artistResults
    .map((r) => r.artist)
    .filter((a): a is FeaturedArtist => a !== null && !!a.id && !!a.name);

  // 2. Aggregate artist Featured On playlists
  const artistFeaturedPlaylistMap: Record<
    string,
    YTPlaylistItem & { count: number }
  > = {};
  for (const r of artistResults) {
    for (const playlist of r.featuredOnPlaylists) {
      if (artistFeaturedPlaylistMap[playlist.id]) {
        artistFeaturedPlaylistMap[playlist.id].count++;
      } else {
        artistFeaturedPlaylistMap[playlist.id] = { ...playlist, count: 1 };
      }
    }
  }

  const artistFeatured = Object.values(artistFeaturedPlaylistMap)
    .sort((a, b) => b.count - a.count)
    .map(({ count, ...playlist }) => playlist);

  const featuredPlaylists = artistFeatured.slice(0, limit);

  return {
    featuredPlaylists,
    artists: artists.slice(0, limit),
  };
}
