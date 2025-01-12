import { actionsMenu, loadingScreen, openInYtBtn } from "../lib/dom";
import { $, getDownloadLink, notify } from "../lib/utils";
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
            loadingScreen.showModal();
            getLyrics().finally(() => loadingScreen.close());
          }
        }>
          <i class="ri-music-2-line"></i>View Lyrics
        </li>) :

        (<li id='woytBtn' tabindex={6} on:click={() => {
          open('https://youtu.be/' + store.actionsMenu.id);
        }}>
          <i class="ri-youtube-line"></i>Watch on YouTube
        </li>)

      }

      <li tabindex={7} on:click={() => {
        close();

        const output = location.pathname === '/' ? store.player.data : store.actionsMenu;
        displayer(JSON.stringify(output, null, 4));

      }}>
        <i class="ri-bug-line"></i> Debug Information
      </li>

    </ul >
  )
}


function displayer(text: string) {

  const dialog = $('dialog') as HTMLDialogElement;

  dialog.className = 'displayer';
  dialog.textContent = text;

  document.body.appendChild(dialog);

  dialog.showModal();
  dialog.onclick = function() {
    dialog.close();
    dialog.remove();
  }
}

const getLyrics = () => fetch(
  `https://lrclib.net/api/get?track_name=${store.actionsMenu.title}&artist_name=${store.actionsMenu.author.slice(0, -8)}`,
  {
    headers: {
      'Lrclib-Client': `ytify ${Version.substring(0, 3)} (https://github.com/n-ce/ytify)`
    }
  })
  .then(res => res.json())
  .then(data => {
    const lrc = data.plainLyrics;
    lrc ?
      displayer(lrc) :
      notify(data.message);
  });
