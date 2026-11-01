import { createSignal, onMount, Show } from "solid-js";
import { getCollectionItems } from "@modules/library";
import Carousel from "@components/Carousel";
import { t, store } from "@stores";
import { rankFavoriteArtists } from "@utils";

interface FeaturedResponse {
  featuredPlaylists?: YTPlaylistItem[];
  artists?: Channel[];
}

interface CachedFeatured {
  featuredPlaylists: YTPlaylistItem[];
  timestamp: number;
  artistIds?: string[];
}

export default function () {
  const [featuredPlaylists, setFeaturedPlaylists] = createSignal<
    YTPlaylistItem[]
  >([]);
  let hasAttemptedFetch = false;

  const updateFeatured = async () => {
    if (hasAttemptedFetch) return;
    hasAttemptedFetch = true;

    // Same selection and order as the favorites artist shelf. The backend
    // returns playlists grouped in this exact artist order.
    const artistIds = rankFavoriteArtists(
      getCollectionItems("favorites"),
    ).map((artist) => artist.id);

    // The session cache is only valid for the same artist list (same IDs in
    // the same order), so favorites changes show up immediately.
    try {
      const cached = sessionStorage.getItem("featured_cache");
      if (cached) {
        const parsed = JSON.parse(cached) as CachedFeatured;
        if (
          Array.isArray(parsed.featuredPlaylists) &&
          parsed.featuredPlaylists.length > 0 &&
          Date.now() - parsed.timestamp < 30 * 60 * 1000 &&
          parsed.artistIds?.join(",") === artistIds.join(",")
        ) {
          setFeaturedPlaylists(parsed.featuredPlaylists);
          return;
        }
      }
    } catch {}

    if (artistIds.length === 0) {
      setFeaturedPlaylists([]);
      return;
    }

    try {
      const artistParam = artistIds.join(",");
      // Byte-identical to the favorites artist shelf's request. Sharing the URL
      // means one edge/browser cache entry for both views instead of two.
      const res = await fetch(
        `${store.api}/featured?artistIds=${encodeURIComponent(artistParam)}`,
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
                artistIds,
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
