import { For, Show, createSignal, onMount } from "solid-js";
import { getTracksMap, getCollection } from "@utils";
import ListItem from "@components/ListItem";
import { t, store } from "@stores";

export default function() {
  const [gallery, setGallery] = createSignal({
    userArtists: [] as Channel[],
    relatedArtists: [] as Channel[],
    relatedPlaylists: [] as Playlist[]
  });
  const [isGalleryLoading, setIsGalleryLoading] = createSignal(false);

  const updateGallery = async () => {
    const tracksMap = getTracksMap();
    const tracks = getCollection('favorites')
      .map(id => tracksMap[id])
      .filter(Boolean);
    const artistCounts: Record<string, number> = {};

    tracks
      .filter(track => track.author?.endsWith(' - Topic'))
      .forEach(track => {
        if (track.authorId) {
          artistCounts[track.authorId] = (artistCounts[track.authorId] || 0) + 1;
        }
      });

    const sortedArtists = Object.entries(artistCounts)
      .filter(a => a[1] > 1)
      .sort(([, a], [, b]) => b - a);

    const artistIds = sortedArtists.map(([id]) => id);

    if (artistIds.length < 2) {
      setGallery({ userArtists: [], relatedArtists: [], relatedPlaylists: [] });
      return;
    }

    setIsGalleryLoading(true);
    try {
      const res = await fetch(`${store.api}/api/gallery?id=${artistIds.join(',')}`);
      const data = await res.json() as { userArtists: Channel[], relatedArtists: Channel[], relatedPlaylists: Playlist[] };
      setGallery(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGalleryLoading(false);
    }
  };

  const shuffle = <T,>(array: T[]): T[] => {
    if (!array) return [];
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  onMount(() => {
    if (gallery().userArtists.length === 0) {
      updateGallery();
    }
  });

  return (
    <article class="gallery-article">
      <Show when={!isGalleryLoading()} fallback={<div class="loading-container"><i class="ri-loader-3-line loading-spinner"></i></div>}>
        <div class="userArtists">
          <Show
            when={gallery().userArtists?.length > 0}
            fallback={<p class="fallback">{t('hub_gallery_fallback')}</p>}
          >
            <For each={shuffle(gallery().userArtists)}>
              {(item) => (
                <ListItem
                  name={item.name}
                  id={item.id}
                  type='artist'
                  img={item.img}
                />
              )}
            </For>
          </Show>
        </div>
        <div class="relatedArtists">
          <Show when={gallery().relatedArtists?.length > 0}>
            <For each={shuffle(gallery().relatedArtists)}>
              {(item) => (
                <ListItem
                  name={item.name}
                  id={item.id}
                  img={item.img}
                  type='artist'
                />
              )}
            </For>
          </Show>
        </div>

        <div class="relatedPlaylists">
          <Show when={gallery().relatedPlaylists?.length > 0}>
            <For each={shuffle(gallery().relatedPlaylists)}>
              {(item) => (
                <ListItem
                  name={item.name}
                  id={item.id}
                  img={item.img}
                  type='playlist'
                />
              )}
            </For>
          </Show>
        </div>
      </Show>
    </article>
  );
}
