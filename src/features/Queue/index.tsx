import { createSignal, onMount } from 'solid-js';
import './Queue.css';
import { openFeature, setStore, t, addToQueue, queueStore, setNavStore } from "@lib/stores";
import { config, setConfig } from "@lib/utils";
import { setQueueStore } from "@lib/stores/queue";
import List from "./List";

export default function() {

  let queueSection!: HTMLDivElement;
  let enqueueRelatedStreamsBtn!:
    HTMLLIElement;
  const [removeMode, setRemoveMode] = createSignal(false);

  onMount(() => { openFeature('queue', queueSection); });

  return (
    <section
      id="queue"
      ref={queueSection}
    >

      <ul id="queuetools">
        <li
          onclick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'I') {
              // Clicked on icon
              const btn = target as HTMLElement;
              btn.classList.toggle('on');
              setConfig('shuffle', btn.classList.contains('on'));
            } else {
              // Clicked on li
              setQueueStore('list', (list) => {
                const shuffled = [...list];
                for (let i = shuffled.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
              });
            }
          }}
        >
          <i
            classList={{ on: config.shuffle }}
            class="ri-shuffle-line"></i>{t('upcoming_shuffle')}
        </li>

        <li
          classList={{
            on: removeMode()
          }}
          onclick={() => {
            setRemoveMode(!removeMode());
          }}
        >
          <i class="ri-indeterminate-circle-line"></i>{t('upcoming_remove')}
        </li>

        <li
          classList={{
            on: config.filterLT10
          }}
          onclick={(e) => {
            const btn = e.currentTarget as HTMLElement;
            btn.classList.toggle('on');
            setConfig('filterLT10', btn.classList.contains('on'));
            addToQueue(queueStore.list, { replace: true });
          }}
        >
          <i class="ri-filter-2-line"></i>{t('upcoming_filter_lt10')}
        </li>

        <li
          classList={{
            on: config.allowDuplicates
          }}
          onclick={(e) => {
            const btn = e.currentTarget as HTMLElement;
            btn.classList.toggle('on');
            const allowDuplicates = btn.classList.contains('on');
            setConfig('allowDuplicates', allowDuplicates);

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
          <i class="ri-file-copy-line"></i>{t('upcoming_allow_duplicates')}
        </li >

        <li
          classList={{
            on: config.enqueueRelatedStreams
          }}
          ref={enqueueRelatedStreamsBtn}
          onclick={(e) => {
            const btn = e.currentTarget as HTMLElement;

            btn.classList.toggle('on');
            setConfig('enqueueRelatedStreams', btn.classList.contains('on'));

            setStore('snackbar', t('upcoming_change'));
          }
          }
        >
          <i class="ri-list-check-2"></i>{t('upcoming_enqueue_related')}
        </li >

        <li onclick={
          () => {
            setQueueStore('list', [])
          }
        }>
          <i class="ri-close-large-line"></i>{t('upcoming_clear')}
        </li >

      </ul >
      <List removeMode={removeMode()} />

      <i
        aria-label="close"
        onclick={() => { setNavStore('queue', 'state', false) }}
        class="ri-close-large-line"></i>

    </section >
  );
}
