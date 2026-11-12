import { For, Show, createSignal, onMount } from "solid-js";
import { getLists } from "@modules/library";
import StreamItem from "@components/StreamItem";
import Carousel from "@components/Carousel";
import { t, store } from "@stores";

export default function () {
  const channels = getLists("channels");
  const [isSubfeedLoading, setIsSubfeedLoading] = createSignal(
    channels.length > 0,
  );
  const [subfeed, setSubfeed] = createSignal<YTItem[]>([]);

  const updateSubfeed = async () => {
    setIsSubfeedLoading(true);
    const channelIds = channels.map((channel) => channel.id).join(",");
    try {
      const res = await fetch(`${store.api}/subfeed?id=${channelIds}`);
      const data = (await res.json()) as YTItem[];
      setSubfeed(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubfeedLoading(false);
    }
  };

  onMount(() => {
    if (channels.length > 0 && subfeed().length === 0) {
      updateSubfeed();
    }
  });

  return (
    <Show
      when={channels.length > 0}
      fallback={
        <div class="fallback-card">
          <p class="fallback">{t("hub_subfeed_fallback")}</p>
        </div>
      }
    >
      <Carousel items={channels} itemType="channel" wrap />

      <Show when={isSubfeedLoading() || subfeed().length > 0}>
        <div class="subfeed-list">
          <Show
            when={!isSubfeedLoading()}
            fallback={
              <div class="loading-container">
                <i class="ri-loader-3-line loading-spinner"></i>
              </div>
            }
          >
            <For each={subfeed()}>{(item) => <StreamItem {...item} />}</For>
          </Show>
        </div>
      </Show>
    </Show>
  );
}
