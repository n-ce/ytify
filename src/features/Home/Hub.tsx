import { For, Show, createSignal } from "solid-js";
import { updateSubfeed, updateGallery } from "@lib/modules/hub";
import { fetchCollection, getCollection, getTracksMap, drawer, setDrawer, generateImageUrl, getThumbIdFromLink } from "@lib/utils";
import ListItem from "@components/ListItem";
import StreamItem from "@components/StreamItem";
import { setListStore, setNavStore, t } from "@lib/stores";

export default function() {
  const [subfeed, setSubfeed] = createSignal(drawer.subfeed);
  const [gallery, setGallery] = createSignal({
    userArtists: drawer.userArtists,
    relatedArtists: drawer.relatedArtists,
    relatedPlaylists: drawer.relatedPlaylists
  });

  const tracksMap = getTracksMap(); // Get all tracks
  // Get the first 5 IDs, then map to items
  const recents = getCollection('history')
    .slice(0, 5)
    .map(id => tracksMap[id])
    .filter(Boolean) as CollectionItem[];
  const [isSubfeedLoading, setIsSubfeedLoading] = createSignal(false);
  const [isGalleryLoading, setIsGalleryLoading] = createSignal(false);

  const getFrequentlyPlayedTracks = (limit?: number) => {
    const allTracks = Object.values(getTracksMap());
    const filteredAndSorted = allTracks
      .filter(track => track.plays && track.plays > 1)
      .sort((a, b) => (b.plays as number) - (a.plays as number));

    return filteredAndSorted.slice(0, limit || 100) as CollectionItem[];
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

      <article class="subfeed">
        <p>{t('hub_subfeed')}</p>
        <i
          aria-label={t('hub_refresh')}
          aria-busy={isSubfeedLoading()}
          classList={{ 'ri-refresh-line': true, 'loading': isSubfeedLoading() }}
          onclick={handleSubfeedRefresh}></i>
        <i
          aria-label={t('hub_show_all')}
          class="ri-arrow-right-s-line" onclick={() => {
            const subfeedItems = drawer.subfeed || [];
            setListStore({
              name: t('hub_subfeed'),
              list: subfeedItems as CollectionItem[],
            });
            setNavStore('list', 'state', true);
          }}></i>
        <div>
          <Show
            when={subfeed()?.length > 0}
            fallback={t('hub_subfeed_fallback')}
          >
            <For each={subfeed().slice(0, 5)}>
              {(item) => (
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
              )}
            </For>
          </Show>
        </div>
      </article>


      <article>
        <p>{t('hub_frequently_played')}</p>
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
        ></i>
        <div>
          <Show
            when={getFrequentlyPlayedTracks(5).length > 0}
            fallback={t('hub_frequently_played_fallback')}
          >
            <For each={getFrequentlyPlayedTracks(5)}>
              {(item) => (
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
              )}
            </For>
          </Show>
        </div>
      </article>

      <article>
        <p>{t('hub_recently_listened')}</p>
        <i
          aria-label={t('hub_show_all')}
          class="ri-arrow-right-s-line"
          onclick={() => {
            fetchCollection('history');
          }}
        ></i>
        <div>
          <Show
            when={recents.length > 0}
            fallback={t('hub_recently_listened_fallback')}
          >
            <For each={recents.slice(0, 5)}>
              {(item) => (
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
              )}
            </For>
          </Show>
        </div>
      </article>

      <article>
        <p>{t('hub_discovery')}</p>
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
        ></i>
        <div>
          <Show
            when={!!drawer.discovery?.length}
            fallback={t('hub_discovery_fallback')}
          >
            <For each={drawer.discovery?.slice(0, 5)}>
              {(item) => (
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
              )}
            </For>
          </Show>
        </div>
      </article>


    </div >
  );
}
