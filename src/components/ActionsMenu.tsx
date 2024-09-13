import { actionsMenu, loadingScreen, openInYtBtn } from "../lib/dom";
import { $, notify } from "../lib/utils";
import fetchList from "../modules/fetchList";
import { appendToQueuelist } from "../scripts/queue";
import { store } from "../lib/store";
import './ActionsMenu.css';
import CollectionSelector from "./CollectionSelector";

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

      <CollectionSelector collection={store.actionsMenu} />


      <li tabindex={3} on:click={async () => {
        actionsMenu.close();
        fetchList('/playlists/RD' + store.actionsMenu.id, true);
      }}>
        <i class="ri-radio-line"></i>Start Radio
      </li>

      <li tabindex={4} on:click={async () => {
        close();
        const provider = 'https://api.cobalt.tools/api/json';
        const streamUrl = 'https://youtu.be/' + store.actionsMenu.id;
        loadingScreen.showModal();
        fetch(provider, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: streamUrl,
            isAudioOnly: true,
            aFormat: store.downloadFormat,
            filenamePattern: 'basic'
          })
        })
          .then(_ => _.json())
          .then(_ => {
            const a = $('a');
            a.href = _.url;
            a.click();
          })
          .catch(_ => notify(_))
          .finally(() => loadingScreen.close());
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
        <i class="ri-user-line"></i>View Channel
      </li>

      <li tabindex={6} on:click={() => {
        open('https://youtu.be/' + store.actionsMenu.id);
      }}>
        <i class="ri-youtube-line"></i>Watch on YouTube
      </li>

      <li tabindex={7} on:click={() => {
        close();
        const hls = store.player.HLS;
        store.player.HLS = undefined;

        const dialog = $('dialog') as HTMLDialogElement;
        dialog.className = 'debug';
        dialog.textContent = JSON.stringify(store, null, 4);
        store.player.HLS = hls;
        document.body.appendChild(dialog);
        dialog.showModal();
        dialog.onclick = () => {
          dialog.close();
          dialog.remove();
        }
      }}>
        <i class="ri-bug-line"></i>Stats For Nerds
      </li>

    </ul>
  )
}
