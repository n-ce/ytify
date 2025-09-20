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

  const hasData = Object.values(hub).some(section => Object.keys(section).length > 0) || recents.length > 0;

  return (
    <Show when={hasData} fallback={<p>No hub data available. Explore the app to populate the hub.</p>}>
      <Show when={recents.length > 0}>
        <article>
          <p>Recently Listened To</p>
          <div>
            <For each={recents.slice(0, 5)}>
              {(item) => (
                <StreamItem
                  id={item.id}
                  title={item.title}
                  author={item.author}
                  duration={item.duration}
                  channelUrl={item.channelUrl}
                />
              )}
            </For>
          </div>
        </article>
      </Show>

      <Show when={Object.keys(hub.discovery).length > 0}>
        <article>
          <p>Discovery</p>
          <i class="ri-arrow-right-s-line"></i>
          <div>
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
          </div>
        </article>
      </Show>

      <Show when={Object.keys(hub.playlists).length > 0}>
        <article>
          <p>Playlists</p>
          <div>
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
          </div>
          <button>Load More</button>
        </article>
      </Show>

      <Show when={Object.keys(hub.artists).length > 0}>
        <article>
          <p>Artists</p>
          <div>
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
          </div>
          <button>Load More</button>
        </article>
      </Show>

      <Show when={Object.keys(hub.foryou).length > 0}>
        <article>
          <p>For You</p>
          <div>
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
          </div>
          <button>Load More</button>
        </article>
      </Show>

      <Show when={Object.keys(hub.catchup).length > 0}>
        <article>
          <p>Catch Up</p>
          <div>
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
          </div>
          <button>Load More</button>
        </article>
      </Show>
    </Show>
  );
}
