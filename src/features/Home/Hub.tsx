import { For, Show, createSignal } from "solid-js";
import { getHub, updateSubfeed, updateGallery, updateHubSection } from "@lib/modules/hub";
import { getCollection, getTracksMap } from "@lib/utils";
import ListItem from "@components/ListItem";
import StreamItem from "@components/StreamItem";
import { generateImageUrl, getThumbIdFromLink } from "@lib/utils";


export default function() {
  const [hub, setHub] = createSignal(getHub());
  const tracksMap = getTracksMap(); // Get all tracks
  const [subfeedExpanded, setSubfeedExpanded] = createSignal(false);
  const [frequentlyPlayedExpanded, setFrequentlyPlayedExpanded] = createSignal(false);
  const [discoveryExpanded, setDiscoveryExpanded] = createSignal(false);
  // Get the first 5 IDs, then map to items
  const recents = getCollection('history')
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
          class="ri-refresh-line"
          onclick={handleGalleryRefresh}
        ></i>
        <i
          aria-label="Clear"
          class="ri-delete-bin-2-line"
          onclick={handleClearGallery}
        ></i>
        <Show when={isGalleryLoading()}>
          <i class="ri-loader-3-line"></i>
        </Show>
        <div class="userArtists">
          <Show
            when={hub().userArtists?.length > 0}
            fallback={'Add to your favorites music from distinct artists to generate a gallery.'}
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
          class="ri-refresh-line" onclick={handleSubfeedRefresh}></i>
        <Show when={!subfeedExpanded()}>
          <i
            aria-label="Show All"
            class="ri-arrow-right-s-line"
            onclick={() => setSubfeedExpanded(true)}
          ></i>
        </Show>
        <div>
          <Show when={isSubfeedLoading()}>
            <i class="ri-loader-3-line"></i>
          </Show>
          <Show
            when={hub().subfeed?.length > 0}
            fallback={'Subscribe to YouTube Channels, to get recently released videos here.'}
          >
            <For each={subfeedExpanded() ? hub().subfeed : hub().subfeed.slice(0, 5)}>
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
        <Show when={!frequentlyPlayedExpanded()}>
          <i
            aria-label="Show All"
            class="ri-arrow-right-s-line"
            onclick={() => setFrequentlyPlayedExpanded(true)}
          ></i>
        </Show>
        <div>
          <Show
            when={getFrequentlyPlayedTracks(5).length > 0}
            fallback={'Tracks you play often will show up here.'}
          >
            <For each={frequentlyPlayedExpanded() ? getFrequentlyPlayedTracks() : getFrequentlyPlayedTracks(5)}>
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
        <Show when={!discoveryExpanded()}>
          <i
            aria-label="Show All"
            class="ri-arrow-right-s-line"
            onclick={() => setDiscoveryExpanded(true)}
          ></i>
        </Show>
        <div>
          <Show
            when={!!hub().discovery?.length}
            fallback={'Discoveries related to what you listen to will show up here.'}
          >
            <For each={discoveryExpanded() ? hub().discovery : hub().discovery?.slice(0, 5)}>
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
