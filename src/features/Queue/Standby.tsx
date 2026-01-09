import { For, onMount, Show, createSignal } from "solid-js";
import { getCollectionItems, getTracksMap } from "@lib/utils";
import StreamItem from "@components/StreamItem";
import { queueStore, setQueueStore, t, filterItemsByConfig } from "@lib/stores";
import supermix from "@lib/modules/supermix";

export default function Standby() {
  const [isLoading, setIsLoading] = createSignal(false);

  const fetchStandby = (force = false) => {
    if (!force) {
      const saved = sessionStorage.getItem('standby');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            setQueueStore('standby', parsed);
            return;
          }
        } catch (e) {
          console.error('Failed to parse standby from sessionStorage', e);
        }
      }
    }

    const historyIds = getCollectionItems('history').slice(0, 5).map(i => i.id);
    const tracks = getTracksMap();
    const mostPlayedIds = Object.values(tracks)
      .filter(t => !historyIds.includes(t.id))
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, 5)
      .map(i => i.id);

    const seedIds = [...historyIds, ...mostPlayedIds];

    if (seedIds.length > 0) {
      setIsLoading(true);
      supermix(seedIds).then(mix => {
        let filteredMix = filterItemsByConfig(mix, { ignoreList: queueStore.list });

        const historyItems = getCollectionItems('history');
        if (historyItems.length > 0) {
          const lastItem = historyItems[0];
          const isMusic = lastItem.author?.endsWith(' - Topic');
          if (isMusic) {
            filteredMix = filteredMix.filter(item => item.author?.endsWith(' - Topic'));
          } else {
            filteredMix = filteredMix.filter(item => !item.author?.endsWith(' - Topic'));
          }
        }

        setQueueStore('standby', filteredMix);
        sessionStorage.setItem('standby', JSON.stringify(filteredMix));
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    }
  };

  onMount(() => {
    if (queueStore.standby.length === 0) {
      fetchStandby();
    }
  });

  const handleRefresh = () => {
    fetchStandby(true);
  };


  return (
    <article class="standby-article">
      <p class="standby-header">{t('queue_standby_header')}</p>
      <i
        aria-label={t('hub_refresh')}
        aria-busy={isLoading()}
        classList={{ 'ri-refresh-line': true, 'loading': isLoading() }}
        onclick={handleRefresh}
      ></i>

      <Show when={!isLoading() && queueStore.standby.length > 0}>
        <div class="standby">
          <For each={queueStore.standby}>
            {(item) => (
              <StreamItem
                id={item.id}
                title={item.title}
                author={item.author}
                duration={item.duration}
                authorId={item.authorId}
                context={{
                  src: 'standby',
                  id: 'standby'
                }}
              />
            )}
          </For>
        </div>
      </Show>
    </article>
  );
}
