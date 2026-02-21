import { For, Show, createSignal, onMount } from "solid-js";
import { getLists } from "@utils";
import StreamItem from "@components/StreamItem";
import ListItem from "@components/ListItem";
import { t, store } from "@stores";

export default function() {
  const [isSubfeedLoading, setIsSubfeedLoading] = createSignal(false);
  const [subfeed, setSubfeed] = createSignal<YTItem[]>([]);
  const channels = getLists('channels');

  const updateSubfeed = async () => {
    if (!channels || channels.length === 0) {
      setSubfeed([]);
      return;
    }
    setIsSubfeedLoading(true);
    const channelIds = channels.map(channel => channel.id).join(',');
    try {
      const res = await fetch(`${store.api}/api/subfeed?id=${channelIds}`);
      const data = await res.json() as YTItem[];
      setSubfeed(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubfeedLoading(false);
    }
  };

  onMount(() => {
    if (subfeed().length === 0) {
      updateSubfeed();
    }
  });

  return (
    <article class="subfeed-article">
      <div class="list-carousel">
        <For each={channels}>
          {(channel) => (
            <ListItem
              name={channel.name}
              img={channel.img}
              id={channel.id}
              type='channel'
            />)}
        </For>
      </div>

      <div class="subfeed-list">
        <Show
          when={!isSubfeedLoading()}
          fallback={<div class="loading-container"><i class="ri-loader-3-line loading-spinner"></i></div>}
        >
          <Show
            when={subfeed().length > 0}
            fallback={<p class="fallback">{t('hub_subfeed_fallback')}</p>}
          >
            <For each={subfeed()}>
              {(item) => (
                <StreamItem {...item} />
              )}
            </For>
          </Show>
        </Show>
      </div>
    </article>
  );
}
