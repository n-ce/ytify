import { YTNodes, type Innertube } from "youtubei.js";
import { getClient, getThumbnail, formatThumbnailId } from "./utils.js";
import { readFeatured, upsertPlaylists } from "./catalogClient.js";
import type { Env } from "./env.js";
import type { Recommendation, CuratedPlaylist } from "./catalog.js";

export type FeaturedArtist = Channel & { type: "artist" };

export interface FeaturedResult {
  featuredPlaylists: YTPlaylistItem[];
  communityPlaylists: YTPlaylistItem[];
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

    const header = artist.header;
    if (header?.is(YTNodes.MusicImmersiveHeader)) {
      const h = header.as(YTNodes.MusicImmersiveHeader);
      name = h.title.text || "";
      thumbnails = h.thumbnail?.contents || [];
    } else if (header?.is(YTNodes.MusicVisualHeader)) {
      const h = header.as(YTNodes.MusicVisualHeader);
      name = h.title.text || "";
      thumbnails = h.thumbnail || [];
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
        return h.title?.toString() === "Featured on";
      }
      return false;
    }) as YTNodes.MusicCarouselShelf | undefined;

    const featuredOnPlaylists: YTPlaylistItem[] = (
      playlistsSection?.contents || []
    )
      .map((item): YTPlaylistItem | null => {
        if (item.is(YTNodes.MusicTwoRowItem)) {
          const musicItem = item.as(YTNodes.MusicTwoRowItem);
          return {
            id: musicItem.id || "",
            name: musicItem.title?.toString() || "",
            img: formatThumbnailId(getThumbnail(musicItem.thumbnail || [])),
            author: musicItem.subtitle?.toString() || name || "YouTube Music",
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
  env: Env | undefined,
  trackIds: string[],
  artistIds: string[],
  limit = 20,
): Promise<FeaturedResult> {
  const ytPromise = artistIds.length > 0 ? getClient() : Promise.resolve(null);
  const catalogPromise =
    env && trackIds.length > 0
      ? readFeatured(env, trackIds, limit)
      : Promise.resolve([] as Recommendation[]);

  const [yt, catalogRecommendations] = await Promise.all([
    ytPromise,
    catalogPromise,
  ]);

  let artistResults: FetchArtistResult[] = [];
  if (yt && artistIds.length > 0) {
    artistResults = await Promise.all(
      artistIds.map((id) => fetchArtistData(yt, id)),
    );
  }

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

  // 3. Partition catalog playlists into Featured and Community
  const catalogFeatured: YTPlaylistItem[] = [];
  const catalogCommunity: YTPlaylistItem[] = [];
  const seenPlaylistIds = new Set<string>(artistFeatured.map((p) => p.id));

  for (const rec of catalogRecommendations) {
    if (seenPlaylistIds.has(rec.id)) continue;
    seenPlaylistIds.add(rec.id);

    const playlistItem: YTPlaylistItem = {
      id: rec.id,
      name: rec.title,
      img: rec.thumbnailId,
      author: rec.sectionTitle || "YouTube Music",
      type: "playlist",
    };

    const sectionLower = (rec.sectionTitle || "").toLowerCase();
    if (sectionLower.includes("community")) {
      catalogCommunity.push(playlistItem);
    } else {
      catalogFeatured.push(playlistItem);
    }
  }

  // Row 1: Artist Featured on + Catalog Featured playlists
  const featuredPlaylists = [...artistFeatured, ...catalogFeatured].slice(
    0,
    limit,
  );

  // Row 2: Catalog Community playlists
  const communityPlaylists = catalogCommunity.slice(0, limit);

  // Write discovered artist "Featured on" playlists through to CatalogDO
  if (env && artistFeatured.length > 0) {
    const curated: CuratedPlaylist[] = artistFeatured.map((p) => ({
      id: p.id,
      categorySlug: "artist-featured",
      categoryType: "genre",
      sectionTitle: "Featured on",
      title: p.name,
      thumbnailId: p.img,
      trackIds: [],
      updatedAt: Date.now(),
    }));
    upsertPlaylists(env, curated).catch((err) =>
      console.warn("[featured] playlist upsert failed:", err),
    );
  }

  return {
    featuredPlaylists,
    communityPlaylists,
    artists,
  };
}
