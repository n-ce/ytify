import { createSignal, onMount, Show } from "solid-js";
import { getCollection, getTracksMap } from "@modules/library";
import Carousel from "@components/Carousel";
import { t, store } from "@stores";
import { unique, stripTopic } from "@utils";

interface FeaturedResponse {
  featuredPlaylists?: YTPlaylistItem[];
  artists?: Channel[];
}

interface CachedFeatured {
  featuredPlaylists: YTPlaylistItem[];
  timestamp: number;
}

export default function () {
  const [featuredPlaylists, setFeaturedPlaylists] = createSignal<
    YTPlaylistItem[]
  >([]);
  let hasAttemptedFetch = false;

  const updateFeatured = async () => {
    if (hasAttemptedFetch) return;
    hasAttemptedFetch = true;

    // Check session storage first (valid for 30 minutes, must be non-empty)
    try {
      const cached = sessionStorage.getItem("featured_cache");
      if (cached) {
        const parsed = JSON.parse(cached) as CachedFeatured;
        if (
          Array.isArray(parsed.featuredPlaylists) &&
          parsed.featuredPlaylists.length > 0 &&
          Date.now() - parsed.timestamp < 30 * 60 * 1000
        ) {
          setFeaturedPlaylists(parsed.featuredPlaylists);
          return;
        }
      }
    } catch {}

    const history = getCollection("history");
    const historyIds = unique(history).filter(Boolean);

    const tracksMap = getTracksMap();
    const favorites = getCollection("favorites")
      .map((id) => tracksMap[id])
      .filter(Boolean);

    // Build author -> authorId fallback map from all known tracks with valid authorId
    const authorToIdMap: Record<string, string> = {};
    for (const t of Object.values(tracksMap)) {
      if (t?.author && t?.authorId) {
        const cleanAuthor = stripTopic(t.author).toLowerCase();
        if (cleanAuthor && !authorToIdMap[cleanAuthor]) {
          authorToIdMap[cleanAuthor] = t.authorId;
        }
      }
    }

    const getTrackAuthorId = (track: TrackItem | undefined): string => {
      if (track?.authorId) return track.authorId;
      if (track?.author) {
        const clean = stripTopic(track.author).toLowerCase();
        return authorToIdMap[clean] || "";
      }
      return "";
    };

    const artistCounts: Record<string, number> = {};
    favorites.forEach((track) => {
      const authorId = getTrackAuthorId(track);
      if (authorId) {
        artistCounts[authorId] = (artistCounts[authorId] || 0) + 2;
      }
    });

    historyIds
      .map((id) => tracksMap[id])
      .filter(Boolean)
      .forEach((track) => {
        const authorId = getTrackAuthorId(track);
        if (authorId) {
          artistCounts[authorId] = (artistCounts[authorId] || 0) + 1;
        }
      });

    const artistIds = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, 5);

    if (artistIds.length === 0) {
      setFeaturedPlaylists([]);
      return;
    }

    try {
      const artistParam = artistIds.join(",");
      const res = await fetch(
        `${store.api}/featured?artistIds=${encodeURIComponent(artistParam)}&limit=20`,
      );
      if (res.ok) {
        const data = (await res.json()) as FeaturedResponse;
        const feat = Array.isArray(data.featuredPlaylists)
          ? data.featuredPlaylists
          : [];
        setFeaturedPlaylists(feat);

        if (feat.length > 0) {
          try {
            sessionStorage.setItem(
              "featured_cache",
              JSON.stringify({
                featuredPlaylists: feat,
                timestamp: Date.now(),
              }),
            );
          } catch {}
        }

        if (Array.isArray(data.artists) && data.artists.length > 0) {
          try {
            sessionStorage.setItem(
              "featured_artists",
              JSON.stringify(data.artists),
            );
          } catch {}
        }
      }
    } catch (e) {
      console.error("Failed to fetch featured shelves", e);
    }
  };

  onMount(() => {
    updateFeatured();
  });

  return (
    <Show when={featuredPlaylists().length > 0}>
      <Carousel
        title={t("hub_featured")}
        icon="ri-star-fill"
        items={featuredPlaylists()}
        itemType="playlist"
      />
    </Show>
  );
}
