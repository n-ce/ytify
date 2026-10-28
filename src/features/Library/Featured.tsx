import { For, Show, createSignal, onMount } from "solid-js";
import { getCollection, getTracksMap } from "@modules/library";
import ListItem from "@components/ListItem";
import { t, store } from "@stores";
import { unique, isTopicAuthor } from "@utils";

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
  const [isLoading, setIsLoading] = createSignal(false);
  let hasAttemptedFetch = false;

  const updateFeatured = async () => {
    if (hasAttemptedFetch) return;
    hasAttemptedFetch = true;

    // Check session storage first (valid for 30 minutes)
    try {
      const cached = sessionStorage.getItem("featured_cache");
      if (cached) {
        const parsed = JSON.parse(cached) as CachedFeatured;
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          setFeaturedPlaylists(parsed.featuredPlaylists || []);
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

    const artistCounts: Record<string, number> = {};
    favorites
      .filter((track) => isTopicAuthor(track.author) && track.authorId)
      .forEach((track) => {
        artistCounts[track.authorId] = (artistCounts[track.authorId] || 0) + 2;
      });

    historyIds
      .map((id) => tracksMap[id])
      .filter((track) => isTopicAuthor(track?.author) && track?.authorId)
      .forEach((track) => {
        artistCounts[track.authorId] = (artistCounts[track.authorId] || 0) + 1;
      });

    const artistIds = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, 5);

    if (artistIds.length === 0) {
      setFeaturedPlaylists([]);
      return;
    }

    setIsLoading(true);
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

        try {
          sessionStorage.setItem(
            "featured_cache",
            JSON.stringify({
              featuredPlaylists: feat,
              timestamp: Date.now(),
            }),
          );
        } catch {}

        if (Array.isArray(data.artists)) {
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
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    updateFeatured();
  });

  return (
    <article class="featured-article">
      <p>
        <i class="ri-star-fill"></i>&nbsp;{t("hub_featured")}
      </p>

      <Show
        when={!isLoading()}
        fallback={
          <div class="loading-container">
            <i class="ri-loader-3-line loading-spinner"></i>
          </div>
        }
      >
        <Show
          when={featuredPlaylists().length > 0}
          fallback={
            <div>
              <p class="fallback">{t("hub_featured_fallback")}</p>
            </div>
          }
        >
          <div class="official-shelf">
            <div class="list-carousel">
              <For each={featuredPlaylists()}>
                {(item) => (
                  <ListItem
                    name={item.name}
                    id={item.id}
                    img={item.img}
                    author={item.author || "YouTube Music"}
                    type="playlist"
                  />
                )}
              </For>
            </div>
          </div>
        </Show>
      </Show>
    </article>
  );
}
