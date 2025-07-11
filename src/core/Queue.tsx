import { onMount } from "solid-js";
import { setState, state, store } from "../lib/store";
import { i18n } from "../scripts/i18n";

export default function() {


  let queueSection!: HTMLDivElement;
  let queuelist!: HTMLDivElement;
  let allowDuplicatesBtn!: HTMLLIElement;
  let shuffleBtn!: HTMLLIElement;
  let filterLT10Btn!: HTMLLIElement;
  let removeQBtn!: HTMLLIElement;
  let enqueueRelatedStreamsBtn!: HTMLLIElement;
  onMount(() => {
    console.log(true);
    queueSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  })

  return (
    <section
      id="queue"
      ref={queueSection}
    >

      <ul id="queuetools">
        <li
          class={state.shuffle ? 'on' : ''}
          ref={shuffleBtn}
          onclick={() => ''}>
          <i onclick={() => {
            shuffleBtn.classList.toggle('on');
            setState('shuffle', shuffleBtn.classList.contains('on'));
          }}
            class="ri-shuffle-line"></i>{i18n('upcoming_shuffle')}
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
          <i class="ri-indeterminate-circle-line"></i>{i18n('upcoming_remove')}
        </li>

        <li
          class={state.filterLT10 ? 'on' : ''}
          ref={filterLT10Btn}
          onclick={(e) => {
            const btn = e.currentTarget as HTMLElement;

            btn.classList.toggle('on');
            setState('filterLT10', btn.classList.contains('on'));

            //filterLT10();
          }}
        >
          <i class="ri-filter-2-line"></i>{i18n('upcoming_filter_lt10')}
        </li>

        <li
          class={state.allowDuplicates ? 'on' : ''}
          ref={allowDuplicatesBtn}
          onclick={(e) => {
            const btn = e.currentTarget as HTMLElement;
            btn.classList.toggle('on');
            setState('allowDuplicates', btn.classList.contains('on'));

            // notify(i18n('upcoming_change'));
          }
          }
        >
          <i class="ri-file-copy-line"></i>{i18n('upcoming_allow_duplicates')}
        </li >

        <li
          class={state.enqueueRelatedStreams ? 'on' : ''}
          ref={enqueueRelatedStreamsBtn}
          onclick={(e) => {
            const btn = e.currentTarget as HTMLElement;

            btn.classList.toggle('on');
            setState('enqueueRelatedStreams', btn.classList.contains('on'));

            //notify(i18n('upcoming_change'));
          }
          }
        >
          <i class="ri-list-check-2"></i>{i18n('upcoming_enqueue_related')}
        </li >

        <li onclick={
          () => {
            store.queue.list.length = 0;
            queuelist.innerHTML = '';
          }
        }>
          <i class="ri-close-line"></i>{i18n('upcoming_clear')}
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
