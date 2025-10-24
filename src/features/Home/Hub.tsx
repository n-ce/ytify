import { For, Show, createSignal } from "solid-js";
import { getHub, updateSubfeed, updateRelatedToYourArtists } from "@lib/modules/hub";
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
  const [isRelatedLoading, setIsRelatedLoading] = createSignal(false);

  const handleSubfeedRefresh = () => {
    setIsSubfeedLoading(true);
    updateSubfeed('?preview=1').then(() => {
      setHub(getHub());
      setIsSubfeedLoading(false);
    });
  };

  const handleRelatedRefresh = () => {
    setIsRelatedLoading(true);
    updateRelatedToYourArtists().then(() => {
      setHub(getHub());
      setIsRelatedLoading(false);
    });
  };

  return (
    <div class="hub">
      <article>
        <p>Sub Feed</p>
        <i
          aria-label="Refresh"
          class="ri-refresh-line" onclick={handleSubfeedRefresh}></i>
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
          <Show when={isSubfeedLoading()}>
            <i class="ri-loader-3-line"></i>
          </Show>
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
            when={hub().discovery?.length! > 0}
            fallback={'Discoveries related to what you listen to will show up here.'}
          >
            <For each={hub().discovery!.slice(0, 5)}>
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

      <article>
        <p>Related to your Artists</p>
        <i
          aria-label="Refresh"
          class="ri-refresh-line"
          onclick={handleRelatedRefresh}
        ></i>
        <Show when={isRelatedLoading()}>
          <i class="ri-loader-3-line"></i>
        </Show>
        <div class="playlists">
          <Show
            when={hub().playlists?.length > 0}
          >
            <For each={hub().playlists}>
              {(item) => (
                <ListItem
                  stats={''}
                  title={item.name}
                  url={`/playlist/${item.id}`}
                  thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '')}
                  uploaderData={item.uploader}
                />
              )}
            </For>
          </Show>
        </div>
        <div class="artists">
          <Show
            when={hub().artists?.length > 0}
          >
            <For each={hub().artists}>
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
      </article>
    </div >
  );
}
