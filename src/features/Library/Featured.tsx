import { For, Show, createSignal, onMount } from "solid-js";
import { getCollection, getTracksMap } from "@utils";
import ListItem from "@components/ListItem";
import { t, store, queueStore } from "@stores";

interface RecommendedPlaylist {
  id: string;
  title: string;
  thumbnailId: string;
  categorySlug: string;
  categoryType: string;
  sectionTitle: string;
  score: number;
  trackCount: number;
}

interface ApiResponse {
  playlists?: RecommendedPlaylist[];
  error?: string;
}

export default function () {
  const [officialPlaylists, setOfficialPlaylists] = createSignal<
    RecommendedPlaylist[]
  >([]);
  const [communityPlaylists, setCommunityPlaylists] = createSignal<Playlist[]>(
    [],
  );
  const [isLoading, setIsLoading] = createSignal(false);

  const updateFeatured = async () => {
    const history = getCollection("history");
    const queueHistory = queueStore.history.map((t) => t.id);
    const historyIds = Array.from(
      new Set([...history, ...queueHistory]),
    ).filter(Boolean);

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
      setOfficialPlaylists([]);
      setCommunityPlaylists([]);
      return;
    }

    setIsLoading(true);
    try {
      if (historyIds.length > 0) {
        const idsParam = historyIds.slice(0, 25).join(",");
        const res = await fetch(
          `${store.api}/recommend?ids=${encodeURIComponent(idsParam)}&limit=20`,
        );
        if (res.ok) {
          const data = (await res.json()) as ApiResponse;
          setOfficialPlaylists(
            Array.isArray(data.playlists) ? data.playlists : [],
          );
        }
      }

      if (artistIds.length > 0) {
        const res = await fetch(
          `${store.api}/gallery?id=${artistIds.join(",")}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { relatedPlaylists?: Playlist[] };
          setCommunityPlaylists(
            Array.isArray(data.relatedPlaylists) ? data.relatedPlaylists : [],
          );
        }
      }
    } catch (e) {
      console.error("Failed to fetch featured shelves", e);
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    if (officialPlaylists().length === 0 && communityPlaylists().length === 0) {
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
            officialPlaylists().length > 0 || communityPlaylists().length > 0
          }
          fallback={
            <div>
              <p class="fallback">{t("hub_featured_fallback")}</p>
            </div>
          }
        >
          {/* Shelf 1: Official YT Playlists */}
          <Show when={officialPlaylists().length > 0}>
            <div class="official-shelf">
              <p class="shelf-label">
                <i class="ri-youtube-fill"></i>&nbsp;Official Playlists
              </p>
              <div class="list-carousel">
                <For each={officialPlaylists()}>
                  {(item) => {
                    const section = item.sectionTitle || "";
                    const isFeatured =
                      section.trim().toLowerCase() === "featured playlists" ||
                      section.toLowerCase().includes("featured") ||
                      item.categorySlug?.toLowerCase() === "featured" ||
                      item.categoryType?.toLowerCase() === "featured";
                    return (
                      <ListItem
                        name={item.title}
                        id={item.id}
                        img={
                          item.thumbnailId
                            ? item.thumbnailId.startsWith("/")
                              ? item.thumbnailId
                              : `/${item.thumbnailId}`
                            : ""
                        }
                        author={section || "YouTube Music"}
                        type="playlist"
                        class={isFeatured ? "featured-playlist" : ""}
                      />
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>

          {/* Shelf 2: Community Playlists */}
          <Show when={communityPlaylists().length > 0}>
            <div class="community-shelf">
              <p class="shelf-label">
                <i class="ri-compass-3-line"></i>&nbsp;Community Playlists
              </p>
              <div class="list-carousel">
                <For each={communityPlaylists()}>
                  {(item) => (
                    <ListItem
                      name={item.name}
                      id={item.id}
                      img={item.img}
                      author={item.author}
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
