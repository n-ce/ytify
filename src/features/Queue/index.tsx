import { onMount } from "solid-js";
import './queue.css';
import { openFeature, openDialog, t } from "../../lib/stores";
import { config, setConfig } from "../../lib/utils";
import { setQueueStore } from "../../lib/stores/queue";

export default function() {

  let queueSection!: HTMLDivElement;
  let queuelist!: HTMLDivElement;
  let allowDuplicatesBtn!: HTMLLIElement;
  let shuffleBtn!: HTMLLIElement;
  let filterLT10Btn!: HTMLLIElement;
  let removeQBtn!: HTMLLIElement;
  let enqueueRelatedStreamsBtn!:
    HTMLLIElement;

  onMount(() => { openFeature('queue', queueSection) });

  return (
    <section
      id="queue"
      ref={queueSection}
    >

      <ul id="queuetools">
        <li
          class={config.shuffle ? 'on' : ''}
          ref={shuffleBtn}
          onclick={() => ''}>
          <i onclick={() => {
            shuffleBtn.classList.toggle('on');
            setConfig('shuffle', shuffleBtn.classList.contains('on'));
          }}
            class="ri-shuffle-line"></i>{t('upcoming_shuffle')}
        </li>

        <li
          ref={removeQBtn}
          onclick={(e) => {
            e.currentTarget.classList.toggle('on');
            queuelist.querySelectorAll('.streamItem')
              .forEach(el => {
                el.classList.toggle('delete');
              });
          }}
        >
          <i class="ri-indeterminate-circle-line"></i>{t('upcoming_remove')}
        </li>

        <li
          class={config.filterLT10 ? 'on' : ''}
          ref={filterLT10Btn}
          onclick={(e) => {
            const btn = e.currentTarget as HTMLElement;

            btn.classList.toggle('on');
            setConfig('filterLT10', btn.classList.contains('on'));

            //filterLT10();
          }}
        >
          <i class="ri-filter-2-line"></i>{t('upcoming_filter_lt10')}
        </li>

        <li
          class={config.allowDuplicates ? 'on' : ''}
          ref={allowDuplicatesBtn}
          onclick={(e) => {
            const btn = e.currentTarget as HTMLElement;
            btn.classList.toggle('on');
            setConfig('allowDuplicates', btn.classList.contains('on'));

            openDialog('snackbar', t('upcoming_change'));
          }
          }
        >
          <i class="ri-file-copy-line"></i>{t('upcoming_allow_duplicates')}
        </li >

        <li
          class={config.enqueueRelatedStreams ? 'on' : ''}
          ref={enqueueRelatedStreamsBtn}
          onclick={(e) => {
            const btn = e.currentTarget as HTMLElement;

            btn.classList.toggle('on');
            setConfig('enqueueRelatedStreams', btn.classList.contains('on'));

            openDialog('snackbar', t('upcoming_change'));
          }
          }
        >
          <i class="ri-list-check-2"></i>{t('upcoming_enqueue_related')}
        </li >

        <li onclick={
          () => {
            setTimeout(() => {
              setQueueStore('list', [])
              queuelist.innerHTML = '';
            }, 500);
          }
        }>
          <i class="ri-close-line"></i>{t('upcoming_clear')}
        </li >

      </ul >
      <div
        id="queuelist"
        ref={queuelist}
      >
        <p data-translation="upcoming_info">The Queue is Empty.</p>
      </div>
    </section >
  );
}
