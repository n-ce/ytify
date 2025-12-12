import { For, Show, createSignal } from "solid-js";
import { getHub, updateSubfeed, updateGallery, updateHubSection } from "@lib/modules/hub";
import { fetchCollection, getCollection, getTracksMap } from "@lib/utils";
import ListItem from "@components/ListItem";
import StreamItem from "@components/StreamItem";
import { generateImageUrl, getThumbIdFromLink } from "@lib/utils";
import { setListStore, setNavStore } from "@lib/stores";

export default function() {
  const [hub, setHub] = createSignal(getHub());
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
    updateSubfeed('?preview=1').then(() => {
      setHub(getHub());
      setIsSubfeedLoading(false);
    });
  };

  const handleGalleryRefresh = () => {
    setIsGalleryLoading(true);
    updateGallery().then(() => {
      setHub(getHub());
      setIsGalleryLoading(false);
    });
  };

  const handleClearGallery = () => {
    updateHubSection('relatedArtists', []);
    updateHubSection('relatedPlaylists', []);
    updateHubSection('userArtists', []);
    setHub(getHub());
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
        <p>Gallery</p>
        <i
          aria-label="Refresh"
          aria-busy={isGalleryLoading()}
          classList={{ 'ri-refresh-line': true, 'loading': isGalleryLoading() }}
          onclick={handleGalleryRefresh}
        ></i>
        <i
          aria-label="Clear"
          class="ri-delete-bin-2-line"
          onclick={handleClearGallery}
        ></i>
        <div class="userArtists">
          <Show
            when={hub().userArtists?.length > 0}
            fallback={'Favorite various music to generate a Gallery.'}
          >
            <For each={shuffle(hub().userArtists.filter(item => item.id && item.name && item.thumbnail))}>
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
            when={hub().relatedArtists?.length > 0}
          >
            <For each={shuffle(hub().relatedArtists)}>
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
            when={hub().relatedPlaylists?.length > 0}
          >
            <For each={shuffle(hub().relatedPlaylists)}>
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
        <p>Sub Feed</p>
        <i
          aria-label="Refresh"
          aria-busy={isSubfeedLoading()}
          classList={{ 'ri-refresh-line': true, 'loading': isSubfeedLoading() }}
          onclick={handleSubfeedRefresh}></i>
        <i
          aria-label="Show All"
          class="ri-arrow-right-s-line" onclick={() => {
            updateSubfeed();
            const subfeedItems = getHub().subfeed || [];
            setListStore({
              name: 'Sub Feed',
              list: subfeedItems as CollectionItem[],
            });
            setNavStore('list', 'state', true);
          }}></i>
        <div>
          <Show
            when={hub().subfeed?.length > 0}
            fallback={'Subscribe to YouTube Channels, to get recently released videos here.'}
          >
            <For each={hub().subfeed.slice(0, 5)}>
              {(item) => (
                <StreamItem
                  id={item.id}
                  title={item.title}
                  author={item.author}
                  duration={item.duration}
                  authorId={item.authorId}
                  context={{
                    id: 'Sub Feed',
                    src: 'hub'
                  }}
                />
              )}
            </For>
          </Show>
        </div>
      </article>


      <article>
        <p>Frequently Played</p>
        <i
          aria-label="Show All"
          class="ri-arrow-right-s-line"
          onclick={() => {
            const frequentlyPlayedItems = getFrequentlyPlayedTracks();
            setListStore({
              name: 'Frequently Played',
              list: frequentlyPlayedItems,
            });
            setNavStore('list', 'state', true);
          }}
        ></i>
        <div>
          <Show
            when={getFrequentlyPlayedTracks(5).length > 0}
            fallback={'Tracks you play often will show up here.'}
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
                    id: 'Frequently Played',
                    src: 'hub'
                  }}
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      <article>
        <p>Recently Listened To</p>
        <i
          aria-label="Show All"
          class="ri-arrow-right-s-line"
          onclick={() => {
            fetchCollection('history');
          }}
        ></i>
        <div>
          <Show
            when={recents.length > 0}
            fallback={'You have no listening History.'}
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
                    id: 'Recently Played',
                    src: 'hub'
                  }}
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      <article>
        <p>Discovery</p>
        <i
          aria-label="Show All"
          class="ri-arrow-right-s-line"
          onclick={() => {
            const discoveryItems = getHub().discovery || [];
            setListStore({
              name: 'Discovery',
              list: discoveryItems as CollectionItem[],
            });
            setNavStore('list', 'state', true);
          }}
        ></i>
        <div>
          <Show
            when={!!hub().discovery?.length}
            fallback={'Discoveries related to what you listen to will show up here.'}
          >
            <For each={hub().discovery?.slice(0, 5)}>
              {(item) => (
                <StreamItem
                  id={item.id}
                  title={item.title}
                  author={item.author}
                  duration={item.duration}
                  authorId={item.authorId}
                  context={{
                    id: 'Discover',
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
