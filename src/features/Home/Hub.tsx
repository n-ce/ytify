import { Show, createSignal } from "solid-js";
import { updateSubfeed, updateGallery } from "@lib/modules/hub";
import { fetchCollection, getCollection, getTracksMap, drawer, setDrawer, generateImageUrl, getThumbIdFromLink } from "@lib/utils";
import ListItem from "@components/ListItem";
import StreamItem from "@components/StreamItem";
import { setListStore, setNavStore, t } from "@lib/stores";
import { Carousel } from "@components/Carousel";
import { SkeletonLoader } from "@components/SkeletonLoader";

export default function () {
  const [subfeed, setSubfeed] = createSignal(drawer.subfeed);
  const [gallery, setGallery] = createSignal({
    userArtists: drawer.userArtists,
    relatedArtists: drawer.relatedArtists,
    relatedPlaylists: drawer.relatedPlaylists
  });

  const tracksMap = getTracksMap();
  const recents = getCollection('history')
    .slice(0, 10)
    .map(id => tracksMap[id])
    .filter(Boolean) as CollectionItem[];
  
  const [isSubfeedLoading, setIsSubfeedLoading] = createSignal(false);
  const [isGalleryLoading, setIsGalleryLoading] = createSignal(false);

  const getFrequentlyPlayedTracks = (limit?: number) => {
    const allTracks = Object.values(getTracksMap());
    const filteredAndSorted = allTracks
      .filter(track => track.plays && track.plays > 1)
      .sort((a, b) => (b.plays as number) - (a.plays as number));

    return filteredAndSorted.slice(0, limit || 20) as CollectionItem[];
  };

  const handleSubfeedRefresh = () => {
    setIsSubfeedLoading(true);
    updateSubfeed().then(() => {
      setSubfeed(drawer.subfeed);
      setIsSubfeedLoading(false);
    });
  };

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
    <div class="hub">
      {/* --- Gallery Section --- */}
      <Show when={gallery().userArtists?.length > 0 || isGalleryLoading()}>
        <Carousel
          title={t('hub_gallery')}
          items={shuffle(gallery().userArtists.filter(item => item.id && item.name && item.thumbnail))}
          headerContent={
            <>
              <i
                aria-label={t('hub_refresh')}
                aria-busy={isGalleryLoading()}
                classList={{ 'ri-refresh-line': true, 'loading': isGalleryLoading() }}
                onclick={handleGalleryRefresh}
                style="cursor: pointer; font-size: 1.2rem; color: var(--text-secondary);"
              ></i>
              <i
                aria-label={t('hub_clear')}
                class="ri-delete-bin-2-line"
                onclick={handleClearGallery}
                style="cursor: pointer; font-size: 1.2rem; color: var(--text-secondary);"
              ></i>
            </>
          }
          renderItem={(item) => (
            <div style="width: 140px;">
              <ListItem
                stats={''}
                title={item.name}
                url={`/artist/${item.id}`}
                thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '')}
                uploaderData={''}
              />
            </div>
          )}
        />
      </Show>

      {/* --- Subfeed Section --- */}
      <Carousel
        title={t('hub_subfeed')}
        items={subfeed() || []}
        headerContent={
          <>
            <i
              aria-label={t('hub_refresh')}
              aria-busy={isSubfeedLoading()}
              classList={{ 'ri-refresh-line': true, 'loading': isSubfeedLoading() }}
              onclick={handleSubfeedRefresh}
              style="cursor: pointer; font-size: 1.2rem; color: var(--text-secondary);"
            ></i>
            <i
              aria-label={t('hub_show_all')}
              class="ri-arrow-right-s-line"
              onclick={() => {
                const subfeedItems = drawer.subfeed || [];
                setListStore({
                  name: t('hub_subfeed'),
                  list: subfeedItems as CollectionItem[],
                });
                setNavStore('list', 'state', true);
              }}
              style="cursor: pointer; font-size: 1.5rem; color: var(--text-secondary);"
            ></i>
          </>
        }
        renderItem={(item) => (
           <div style="min-width: 200px; max-width: 240px;">
            <StreamItem
              id={item.id}
              title={item.title}
              author={item.author}
              duration={item.duration}
              authorId={item.authorId}
              context={{
                id: t('hub_subfeed'),
                src: 'hub'
              }}
            />
          </div>
        )}
      />

       {/* --- Frequently Played --- */}
      <Show when={getFrequentlyPlayedTracks().length > 0}>
         <Carousel
          title={t('hub_frequently_played')}
          items={getFrequentlyPlayedTracks()}
          headerContent={
             <i
              aria-label={t('hub_show_all')}
              class="ri-arrow-right-s-line"
              onclick={() => {
                const frequentlyPlayedItems = getFrequentlyPlayedTracks();
                setListStore({
                  name: t('hub_frequently_played'),
                  list: frequentlyPlayedItems,
                });
                setNavStore('list', 'state', true);
              }}
              style="cursor: pointer; font-size: 1.5rem; color: var(--text-secondary);"
            ></i>
          }
          renderItem={(item) => (
            <div style="min-width: 200px; max-width: 240px;">
              <StreamItem
                id={item.id}
                title={item.title}
                author={item.author}
                duration={item.duration}
                authorId={item.authorId}
                context={{
                  id: t('hub_frequently_played'),
                  src: 'hub'
                }}
              />
            </div>
          )}
        />
      </Show>

      {/* --- Recently Listened --- */}
      <Show when={recents.length > 0}>
        <Carousel
          title={t('hub_recently_listened')}
          items={recents}
          headerContent={
            <i
              aria-label={t('hub_show_all')}
              class="ri-arrow-right-s-line"
              onclick={() => {
                 fetchCollection('history');
              }}
              style="cursor: pointer; font-size: 1.5rem; color: var(--text-secondary);"
            ></i>
          }
          renderItem={(item) => (
            <div style="min-width: 200px; max-width: 240px;">
              <StreamItem
                id={item.id}
                title={item.title}
                author={item.author}
                duration={item.duration}
                authorId={item.authorId}
                context={{
                  id: t('hub_recently_listened'),
                  src: 'hub'
                }}
              />
            </div>
          )}
        />
      </Show>

      {/* --- Discovery --- */}
      <Show when={!!drawer.discovery?.length}>
        <Carousel
          title={t('hub_discovery')}
          items={drawer.discovery || []}
          headerContent={
             <i
              aria-label={t('hub_show_all')}
              class="ri-arrow-right-s-line"
              onclick={() => {
                const discoveryItems = drawer.discovery || [];
                setListStore({
                  name: t('hub_discovery'),
                  list: discoveryItems as CollectionItem[],
                });
                setNavStore('list', 'state', true);
              }}
              style="cursor: pointer; font-size: 1.5rem; color: var(--text-secondary);"
            ></i>
          }
          renderItem={(item) => (
            <div style="min-width: 200px; max-width: 240px;">
              <StreamItem
                id={item.id}
                title={item.title}
                author={item.author}
                duration={item.duration}
                authorId={item.authorId}
                context={{
                  id: t('hub_discovery'),
                  src: 'hub'
                }}
              />
            </div>
          )}
        />
      </Show>

      {/* --- Loading State --- */}
      <Show when={isSubfeedLoading() || isGalleryLoading()}>
        <div style="padding: 20px;">
           <SkeletonLoader type="card" count={4} />
        </div>
      </Show>
    </div>
  );
}
