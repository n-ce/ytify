import './Queue.css';
import { setStore, t, addToQueue, queueStore } from "@lib/stores";
import { config, setConfig } from "@lib/utils";
import { setQueueStore, groupQueueByAuthor } from "@lib/stores/queue";

export default function Dropdown() {
  return (
    <details>
      <summary><i
        aria-label="More Options"
        class="ri-more-2-fill"
      ></i></summary>
      <ul class="queuetools" onclick={(e) => e.stopPropagation()}>

        <li
          classList={{ on: config.persistentShuffle }}
          onclick={(e) => {
            setConfig('persistentShuffle', !config.persistentShuffle);
            (e.currentTarget as HTMLElement).classList.toggle('on');
          }}
        >
          {t('queue_persistent_shuffle')}
        </li>

        <li
          classList={{ on: config.manualOrdering }}
          onclick={(e) => {
            setConfig('manualOrdering', !config.manualOrdering);
            setStore('snackbar', t('queue_reload_notification'));
            (e.currentTarget as HTMLElement).classList.toggle('on');
          }}
        >
          {t('queue_manual_ordering')}
        </li>

        <li
          classList={{ on: Boolean(config.durationFilter) }}
          onclick={(e) => {
            const val = config.durationFilter ? '' : prompt('Enter duration limit (e.g. 10:00)', '10:00');
            if (val !== null) {
              setConfig('durationFilter', val);
              addToQueue(queueStore.list, { replace: true });
              (e.currentTarget as HTMLElement).classList.toggle('on', Boolean(val));
            }
          }}
        >
          {t('queue_duration_filter')}
        </li>

        <li
          classList={{ on: config.allowDuplicates }}
          onclick={(e) => {
            const allowDuplicates = !config.allowDuplicates;
            setConfig('allowDuplicates', allowDuplicates);
            (e.currentTarget as HTMLElement).classList.toggle('on');

            if (!allowDuplicates) {
              setQueueStore('list', (list) => {
                const uniqueIds = new Set<string>();
                return list.filter(item => {
                  if (uniqueIds.has(item.id)) {
                    return false;
                  } else {
                    uniqueIds.add(item.id);
                    return true;
                  }
                });
              });
            }
          }}
        >
          {t('queue_allow_duplicates')}
        </li>

        <li
          classList={{ on: config.similarContent }}
          onclick={(e) => {
            setConfig('similarContent', !config.similarContent);
            setStore('snackbar', t('queue_change_notification'));
            (e.currentTarget as HTMLElement).classList.toggle('on');
          }}
        >
          {t('queue_similar_content')}
        </li>

        <li
          classList={{ on: config.contextualFill }}
          onclick={(e) => {
            setConfig('contextualFill', !config.contextualFill);
            (e.currentTarget as HTMLElement).classList.toggle('on');
          }}
        >
          {t('queue_contextual_fill')}
        </li>

        <li
          classList={{ on: config.queuePrefetch }}
          onclick={(e) => {
            setConfig('queuePrefetch', !config.queuePrefetch);
            (e.currentTarget as HTMLElement).classList.toggle('on');
          }}
        >
          {t('queue_prefetch')}
        </li>

        <li
          classList={{ on: config.authorGrouping }}
          onclick={(e) => {
            const authorGrouping = !config.authorGrouping;
            setConfig('authorGrouping', authorGrouping);
            (e.currentTarget as HTMLElement).classList.toggle('on');
            if (authorGrouping) {
              setQueueStore('list', (list) => groupQueueByAuthor(list));
            }
          }}
        >
          {t('queue_author_grouping')}
        </li>

        <li onclick={
          () => {
            setQueueStore('list', [])
          }
        }>
          {t('queue_clear')}
        </li >


      </ul>
    </details>
  );
}

