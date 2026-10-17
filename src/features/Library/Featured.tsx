import { For, Show, createSignal, onMount } from "solid-js";
import { getCollection, getTracksMap } from "@utils";
import ListItem from "@components/ListItem";
import { t, store } from "@stores";

interface FeaturedResponse {
  featuredPlaylists?: YTPlaylistItem[];
  communityPlaylists?: YTPlaylistItem[];
  artists?: Channel[];
}

export default function () {
  const [featuredPlaylists, setFeaturedPlaylists] = createSignal<
    YTPlaylistItem[]
  >([]);
  const [communityPlaylists, setCommunityPlaylists] = createSignal<
    YTPlaylistItem[]
  >([]);
  const [isLoading, setIsLoading] = createSignal(false);

  const updateFeatured = async () => {
    // Strictly persistent history IDs
    const history = getCollection("history");
    const historyIds = Array.from(new Set(history)).filter(Boolean);

    const tracksMap = getTracksMap();
    const favorites = getCollection("favorites")
      .map((id) => tracksMap[id])
      .filter(Boolean);

    const artistCounts: Record<string, number> = {};
    favorites
      .filter((track) => track.author?.includes("- Topic"))
      .forEach((track) => {
        if (track.authorId) {
          artistCounts[track.authorId] =
            (artistCounts[track.authorId] || 0) + 1;
        }
      });
    const artistIds = Object.keys(artistCounts).slice(0, 5);

    if (historyIds.length === 0 && artistIds.length === 0) {
      setFeaturedPlaylists([]);
      setCommunityPlaylists([]);
      return;
    }

    setIsLoading(true);
    try {
      const idsParam = historyIds.slice(0, 25).join(",");
      const artistParam = artistIds.join(",");
      const res = await fetch(
        `${store.api}/featured?ids=${encodeURIComponent(idsParam)}&artistIds=${encodeURIComponent(artistParam)}&limit=20`,
      );
      if (res.ok) {
        const data = (await res.json()) as FeaturedResponse;
        setFeaturedPlaylists(
          Array.isArray(data.featuredPlaylists) ? data.featuredPlaylists : [],
        );
        setCommunityPlaylists(
          Array.isArray(data.communityPlaylists) ? data.communityPlaylists : [],
        );

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
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    if (featuredPlaylists().length === 0 && communityPlaylists().length === 0) {
      updateFeatured();
    }
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
          when={
            featuredPlaylists().length > 0 || communityPlaylists().length > 0
          }
          fallback={
            <div>
              <p class="fallback">{t("hub_featured_fallback")}</p>
            </div>
          }
        >
          {/* Shelf 1: Featured Playlists */}
          <Show when={featuredPlaylists().length > 0}>
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

          {/* Shelf 2: Community Playlists */}
          <Show when={communityPlaylists().length > 0}>
            <div class="community-shelf">
              <div class="list-carousel">
                <For each={communityPlaylists()}>
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
      </Show>
    </article>
  );
}
