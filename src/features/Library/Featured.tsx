import { For, Show, createSignal, onMount } from "solid-js";
import { getCollection } from "@utils";
import ListItem from "@components/ListItem";
import { t, queueStore } from "@stores";

interface ApiPlaylist {
  id: string;
  name: string;
  thumbnailId: string;
  categoryType?: string;
  categorySlug?: string;
  section?: string;
  score?: number;
  matchedTrackIds?: string[];
  matchedArtists?: string[];
  url?: string;
}

interface ApiResponse {
  success?: boolean;
  count?: number;
  totalInputTracks?: number;
  recognizedInputTracks?: number;
  playlists?: ApiPlaylist[];
  error?: string;
}

export default function () {
  const [playlists, setPlaylists] = createSignal<ApiPlaylist[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);

  const updateFeatured = async () => {
    const history = getCollection("history");
    const queueHistory = queueStore.history.map((t) => t.id);
    const historyIds = Array.from(
      new Set([...history, ...queueHistory]),
    ).filter(Boolean);

    if (historyIds.length === 0) {
      setPlaylists([]);
      return;
    }

    setIsLoading(true);
    try {
      const idsParam = historyIds.slice(0, 25).join(",");
      const res = await fetch(
        `https://ytmgr-seven.vercel.app?ids=${encodeURIComponent(idsParam)}&limit=20`,
      );
      if (!res.ok) {
        setPlaylists([]);
        return;
      }
      const data = (await res.json()) as ApiResponse;
      if (data.playlists && Array.isArray(data.playlists)) {
        const filtered = data.playlists.filter((item) => {
          const section = item.section?.toLowerCase();
          return section !== "songs" && section !== "albums";
        });
        setPlaylists(filtered);
      } else {
        setPlaylists([]);
      }
    } catch (e) {
      console.error("Failed to fetch featured playlists", e);
      setPlaylists([]);
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    if (playlists().length === 0) {
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
        <div class="featuredPlaylists">
          <Show
            when={playlists().length > 0}
            fallback={<p class="fallback">{t("hub_featured_fallback")}</p>}
          >
            <For each={playlists()}>
              {(item) => {
                const isFeatured =
                  item.section?.trim().toLowerCase() === "featured playlists" ||
                  item.section?.toLowerCase().includes("featured") ||
                  item.categorySlug?.toLowerCase() === "featured" ||
                  item.categoryType?.toLowerCase() === "featured";
                return (
                  <ListItem
                    name={item.name}
                    id={item.id}
                    img={
                      item.thumbnailId
                        ? item.thumbnailId.startsWith("/")
                          ? item.thumbnailId
                          : `/${item.thumbnailId}`
                        : ""
                    }
                    author={item.section || "YouTube Music"}
                    type="playlist"
                    class={isFeatured ? "featured-playlist" : ""}
                  />
                );
              }}
            </For>
          </Show>
        </div>
      </Show>
    </article>
  );
}
