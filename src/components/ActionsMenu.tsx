import { actionsMenu, loadingScreen, openInYtBtn } from "../lib/dom";
import { $, getDownloadLink } from "../lib/utils";
import fetchList from "../modules/fetchList";
import { appendToQueuelist } from "../scripts/queue";
import { getSaved, store } from "../lib/store";
import './ActionsMenu.css';
import CollectionSelector from "./CollectionSelector";
import { createSignal, lazy, onMount, Show } from "solid-js";
import { render } from "solid-js/web";

declare module "solid-js" {
  namespace JSX {
    interface CustomEvents
      extends Pick<HTMLElementEventMap, 'click'> { }
  }
}

function close() {
  actionsMenu.close();
  history.back();
}

actionsMenu.onclick = close;

const WatchOnYtify = lazy(() => import('./WatchOnYtify'));
const Lyrics = lazy(() => import('./Lyrics.tsx'));

export default function() {

  const [isMusic, setMusic] = createSignal(false);
  const [isWatchOnYtify, setWatchOnYtify] = createSignal('' as string | null);

  onMount(() => {
    new IntersectionObserver(() => {
      if (actionsMenu.checkVisibility()) {
        setMusic(store.actionsMenu.author.endsWith('- Topic'));
        setWatchOnYtify(getSaved('watchOnYtify'));
      }
    }).observe(actionsMenu);
  });

  return (
    <ul on:click={e => e.stopPropagation()}>
      <li tabindex={0} on:click={() => {
        appendToQueuelist(store.actionsMenu, true);
        close();
      }}>
        <i class="ri-skip-forward-line"></i><span data-translation="actions_menu_play_next">Play Next</span>
      </li>

      <li tabindex={1} on:click={() => {
        appendToQueuelist(store.actionsMenu);
        close();
      }}>
        <i class="ri-list-check-2"></i><span data-translation="actions_menu_enqueue">Enqueue</span>
      </li>

      <CollectionSelector collection={store.actionsMenu} close={close} />


      <Show when={!getSaved('kidsMode_Start Radio Button')}>
        <li tabindex={3} on:click={async () => {
          close();
          fetchList('/playlists/RD' + store.actionsMenu.id, true);
        }}>
            <i class="ri-radio-line"></i><span data-translation="actions_menu_start_radio">Start Radio</span>
        </li>
      </Show>

      <li tabindex={4} on:click={async () => {
        close();
        loadingScreen.showModal();
        const a = $('a');
        const l = await getDownloadLink(store.actionsMenu.id);
        if (l) {
          a.href = l;
          a.click();
        }
        loadingScreen.close();
      }}>
        <i class="ri-download-2-fill"></i><span data-translation="actions_menu_download">Download</span>
      </li>

      <Show when={!getSaved('kidsMode_View Channel/Artist Button')}>
        <li tabindex={5} on:click={() => {
          close();
          const smd = store.actionsMenu;
          store.list.name =
            smd.author.endsWith('- Topic') ?
              ('Artist - ' + smd.author.replace('- Topic', ''))
              : '';

          (openInYtBtn.firstElementChild as HTMLParagraphElement)
            .dataset.state = ' ' + smd.author;

          fetchList(smd.channelUrl);
        }}>

          <i class="ri-user-line"></i>
            {isMusic() ?
                <span data-translation="actions_menu_view_artist">View Artist</span>
                :
                <span data-translation="actions_menu_view_channel">View Channel</span>
            }
        </li>
      </Show>

      {isMusic() ?
        <li tabindex={6} on:click={
          () => {
            close();
            render(Lyrics, document.body);
          }
        }>
          <i class="ri-music-2-line"></i>View Lyrics
        </li> :

        <Show when={!getSaved('kidsMode_Watch On Button')}>
          {
            isWatchOnYtify() ?
              <li tabindex={6} on:click={() => {
                close();
                render(WatchOnYtify, document.body);
              }}>
                <i class="ri-youtube-line"></i><span data-translation="actions_menu_watch_ytify">Watch on  ytify</span>
              </li>
              :
              <li tabindex={6} on:click={() => {
                close();
                open('https://youtu.be/' + store.actionsMenu.id);
              }}>
                <i class="ri-youtube-line"></i><span data-translation="actions_menu_watch_youtube">Watch on YouTube</span>
              </li>
          }
        </Show>

      }

      <li tabindex={7} on:click={() => {
        close();

        const output = location.pathname === '/' ? store.player.data : store.actionsMenu;

        render(() => {
          let dialog!: HTMLDialogElement;
          onMount(() => dialog.showModal());
          return <dialog
            ref={dialog}
            class="displayer"
            onclick={() => {
              dialog.close();
              dialog.remove();
            }}
          >
            {JSON.stringify(output, null, 4)}
          </dialog>
        }, document.body);

      }}>
        <i class="ri-bug-line"></i> <span data-translation="actions_menu_debug_info">Debug Information</span>
      </li>

    </ul>
  )
}

