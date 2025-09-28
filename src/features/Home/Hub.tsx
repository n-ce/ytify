import { For, Show } from "solid-js";
import { getHub } from "../../lib/modules/hub";
import { getDB } from "../../lib/utils";
import ListItem from "../../components/ListItem";
import StreamItem from "../../components/StreamItem";
import { generateImageUrl, getThumbIdFromLink } from "../../lib/utils";

export default function() {
  const hub = getHub();
  const { history } = getDB();
  const recents = history ? Object.values(history).reverse().slice(0, 5) : [];

  return (
    <>
      <article>
        <p>Catch Up</p>
        <i class="ri-refresh-line"></i>
        <i class="ri-arrow-right-s-line"></i>
        <div>
          <Show
            when={Object.keys(hub.catchup).length > 0}
            fallback={'Subscribe to YouTube Channels, to get recently released videos here.'}
          >
            <For each={Object.values(hub.catchup).slice(0, 5)}>
              {(item) => (
                <StreamItem
                  id={item.id}
                  title={item.title}
                  author={item.author}
                  duration={item.duration}
                  channelUrl={item.channelUrl}
                  context='hub'
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      <article>
        <p>Recently Listened To</p>
        <i class="ri-arrow-right-s-line"></i>
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
                  channelUrl={item.channelUrl}
                  context='hub'
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      <article>
        <p>Discovery</p>
        <i class="ri-arrow-right-s-line"></i>
        <div>
          <Show
            when={Object.keys(hub.discovery).length > 0}
            fallback={'Discoveries related to what you listen to will show up here.'}
          >
            <For each={Object.values(hub.discovery).slice(0, 5)}>
              {(item) => (
                <StreamItem
                  id={item.id}
                  title={item.title}
                  author={item.author}
                  duration={item.duration}
                  channelUrl={item.channelUrl}
                  context='hub'
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      <article>
        <p>Featured Playlists</p>
        <i class="ri-refresh-line"></i>
        <div>
          <Show
            when={Object.keys(hub.playlists).length > 0}
            fallback={'Playlists that Feature your saved Artists show up here.'}
          >
            <For each={Object.values(hub.playlists).slice(0, 5)}>
              {(item) => (
                <ListItem
                  stats={item.frequency ? `${item.frequency} plays` : ''}
                  title={item.name}
                  url={`/playlist/${item.id}`}
                  thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '')}
                  uploader_data={item.uploader}
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      <article>
        <p>Artists you may like</p>
        <i class="ri-refresh-line"></i>
        <div>
          <Show
            when={Object.keys(hub.artists).length > 0}
            fallback={'save Artists to your library to find related artists here.'}
          >
            <For each={Object.values(hub.artists).slice(0, 5)}>
              {(item) => (
                <ListItem
                  stats={item.frequency ? `${item.frequency} plays` : ''}
                  title={item.name}
                  url={`/artist/${item.id}`}
                  thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '')}
                  uploader_data={''}
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      <article>
        <p>Streams For You</p>
        <i class="ri-refresh-line"></i>
        <i class="ri-arrow-right-s-line"></i>
        <div>
          <Show
            when={Object.keys(hub.foryou).length > 0}
            fallback={'A locally run algorithm finds similar streams to your favorites here.'}
          >
            <For each={Object.values(hub.foryou).slice(0, 5)}>
              {(item) => (
                <StreamItem
                  id={item.id}
                  title={item.title}
                  author={item.author}
                  duration={item.duration}
                  channelUrl={item.channelUrl}
                  context='hub'
                />
              )}
            </For>
          </Show>
        </div>
      </article>

    </>
  );
}
