import { actionsMenu, loadingScreen, openInYtBtn } from "../lib/dom";
import { $, downloader } from "../lib/utils";
import fetchList from "../modules/fetchList";
import { appendToQueuelist } from "../scripts/queue";
import { store } from "../lib/store";
import './ActionsMenu.css';
import CollectionSelector from "./CollectionSelector";
import { createSignal } from "solid-js";

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

  new IntersectionObserver(() => {
    if (actionsMenu.checkVisibility())
      setMusic(store.actionsMenu.author.endsWith('- Topic'));
  }).observe(actionsMenu);


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
        await downloader(store.actionsMenu.id);
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

      <li tabindex={6} on:click={() => {
        open('https://youtu.be/' + store.actionsMenu.id);
      }}>
        <i class="ri-youtube-line"></i>Watch on YouTube
      </li>

      <li tabindex={7} on:click={() => {
        close();

        const output = location.pathname === '/' ? store.player.data : store.actionsMenu;
        const dialog = $('dialog') as HTMLDialogElement;

        dialog.className = 'debug';
        dialog.textContent = JSON.stringify(output, null, 4);

        document.body.appendChild(dialog);

        dialog.showModal();
        dialog.onclick = function() {
          dialog.close();
          dialog.remove();
        }

      }}>
        <i class="ri-bug-line"></i> Debug Information
      </li>

    </ul>
  )
}
