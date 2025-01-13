import { actionsMenu, loadingScreen, openInYtBtn } from "../lib/dom";
import { $, getDownloadLink } from "../lib/utils";
import fetchList from "../modules/fetchList";
import { appendToQueuelist } from "../scripts/queue";
import { getSaved, store } from "../lib/store";
import './ActionsMenu.css';
import CollectionSelector from "./CollectionSelector";
import { createSignal, onMount } from "solid-js";
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

export default function() {

  const [isMusic, setMusic] = createSignal(false);

  onMount(() => {
    new IntersectionObserver(() => {
      if (actionsMenu.checkVisibility())
        setMusic(store.actionsMenu.author.endsWith('- Topic'));
    }).observe(actionsMenu);
  });

  return (
    <ul on:click={e => e.stopPropagation()}>
      <li tabindex={0} on:click={() => {
        appendToQueuelist(store.actionsMenu, true);
        close();
      }}>
        <i class="ri-skip-forward-line"></i>Play Next
      </li>

      <li tabindex={1} on:click={() => {
        appendToQueuelist(store.actionsMenu);
        close();
      }}>
        <i class="ri-list-check-2"></i>Enqueue
      </li>

      <CollectionSelector collection={store.actionsMenu} close={close} />


      <li tabindex={3} on:click={async () => {
        close();
        fetchList('/playlists/RD' + store.actionsMenu.id, true);
      }}>
        <i class="ri-radio-line"></i>Start Radio
      </li>

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
        <i class="ri-download-2-fill"></i>Download
      </li>

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
        <i class="ri-user-line"></i>View {isMusic() ? 'Artist' : 'Channel'}
      </li>

      {isMusic() ?
        (<li tabindex={6} on:click={
          () => {
            close();
            import('./Lyrics.tsx')
              .then(mod => render(mod.default, document.body));
          }
        }>
          <i class="ri-music-2-line"></i>View Lyrics
        </li>) :

        (<li id='woytBtn' tabindex={6} on:click={() => {
          close();
          getSaved('watchOnYtify') ?
            import('./watchOnYtify')
              .then(mod => render(mod.default, document.body)) :
            open('https://youtu.be/' + store.actionsMenu.id);
        }}>
          <i class="ri-youtube-line"></i>Watch on {getSaved('watchOnYtify') ? 'ytify' : 'YouTube'}
        </li>)

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
        <i class="ri-bug-line"></i> Debug Information
      </li>

    </ul>
  )
}

