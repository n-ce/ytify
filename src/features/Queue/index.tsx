import { onMount, Show } from 'solid-js';
import './Queue.css';
import { queueStore, setNavStore, t, setQueueStore, totalQueueDuration } from "@lib/stores";
import List from "./List";
import Dropdown from './Dropdown';

export default function() {

  let queueSection!: HTMLDivElement;

  onMount(() => {
    setNavStore('queue', 'ref', queueSection);
    queueSection.scrollIntoView();
  });

  return (
    <section
      class="queueSection"
      ref={queueSection}
    >

      <header class="sticky-bar">
        <p>{queueStore.list.length === 0 ? t('nav_queue') : totalQueueDuration(queueStore.list)}</p>
        <div class="right-group">
          <i
            class="ri-shuffle-line"
            aria-label={t('queue_shuffle')}
            onclick={() => {
              setQueueStore('list', (list) => {
                const shuffled = [...list];
                for (let i = shuffled.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
              });
            }}
          ></i>

          <i
            class="ri-indeterminate-circle-line"
            classList={{
              on: queueStore.removeMode,
            }}
            aria-label={t('queue_remove_mode')}
            onclick={() => {
              setQueueStore('removeMode', !queueStore.removeMode);
            }}
          ></i>
        </div>

        <Dropdown
        />
      </header>

      <Show
        when={!queueStore.isLoading}
        fallback={<i class="ri-loader-3-line loading-spinner"></i>}
      >
        <List />
      </Show>
    </section >
  );
}
