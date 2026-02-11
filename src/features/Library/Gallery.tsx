import { For, Show, createSignal } from "solid-js";
import { updateGallery } from "@lib/modules/hub";
import { drawer, setDrawer, generateImageUrl, getThumbIdFromLink } from "@lib/utils";
import ListItem from "@components/ListItem";
import { t } from "@lib/stores";

export default function Gallery() {
  const [gallery, setGallery] = createSignal({
    userArtists: drawer.userArtists,
    relatedArtists: drawer.relatedArtists,
    relatedPlaylists: drawer.relatedPlaylists
  });
  const [isGalleryLoading, setIsGalleryLoading] = createSignal(false);

  const handleGalleryRefresh = () => {
    setIsGalleryLoading(true);
    updateGallery().then(() => {
      setGallery({
        userArtists: drawer.userArtists,
        relatedArtists: drawer.relatedArtists,
        relatedPlaylists: drawer.relatedPlaylists
      });
      setIsGalleryLoading(false);
    });
  };

  const handleClearGallery = () => {
    setDrawer('relatedArtists', []);
    setDrawer('relatedPlaylists', []);
    setDrawer('userArtists', []);
    setGallery({
      userArtists: [],
      relatedArtists: [],
      relatedPlaylists: []
    });
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

  return (
    <article class="gallery-article">
      <p>{t('hub_gallery')}</p>
      <i
        aria-label={t('hub_refresh')}
        aria-busy={isGalleryLoading()}
        classList={{ 'ri-refresh-line': true, 'loading': isGalleryLoading() }}
        onclick={handleGalleryRefresh}
      ></i>
      <i
        aria-label={t('hub_clear')}
        class="ri-delete-bin-2-line"
        onclick={handleClearGallery}
      ></i>
      <div class="userArtists">
        <Show
          when={gallery().userArtists?.length > 0}
          fallback={t('hub_gallery_fallback')}
        >
          <For each={shuffle(gallery().userArtists.filter(item => item.id && item.name && item.thumbnail))}>
            {(item) => (
              <ListItem
                stats={''}
                title={item.name}
                url={`/artist/${item.id}`}
                thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '')}
                uploaderData={''}
              />
            )}
          </For>
        </Show>
      </div>
      <div class="relatedArtists">
        <Show
          when={gallery().relatedArtists?.length > 0}
        >
          <For each={shuffle(gallery().relatedArtists)}>
            {(item) => (
              <ListItem
                stats={''}
                title={item.name}
                url={`/artist/${item.id}`}
                thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '')}
                uploaderData={''}
              />
            )}
          </For>
        </Show>
      </div>

      <div class="relatedPlaylists">
        <Show
          when={gallery().relatedPlaylists?.length > 0}
        >
          <For each={shuffle(gallery().relatedPlaylists)}>
            {(item) => (
              <ListItem
                stats={''}
                title={item.name}
                url={`/playlist/${item.id}`}
                thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '')}
                uploaderData={''}
              />
            )}
          </For>
        </Show>
      </div>

    </article>
  );
}
