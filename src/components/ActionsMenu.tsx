import { actionsMenu, loadingScreen } from "../lib/dom";
import { addToCollection, createPlaylist } from "../lib/libraryUtils";
import { $, notify } from "../lib/utils";
import fetchList from "../scripts/fetchList";
import { appendToQueuelist } from "../scripts/queue";
import { store } from "../store";
import './ActionsMenu.css';

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

export default function ActionsMenu() {

  return (
    <ul on:click={e => e.stopPropagation()}>
      <li on:click={() => {
        appendToQueuelist(store.actionsMenu, true);
        close();
      }}>
        <i class="ri-skip-forward-line"></i>Play Next
      </li>

      <li on:click={() => {
        appendToQueuelist(store.actionsMenu);
        close();
      }}>
        <i class="ri-list-check-2"></i>Enqueue
      </li>

      <li>
        <i class="ri-play-list-add-line"></i>
        <select
          id="playlistSelector"
          onchange={(e) => {
            const playlistSelector = e.target;
            let title;

            if (!playlistSelector.value) return;
            if (playlistSelector.value === '+pl') {
              title = prompt('Playlist Title')?.trim();

              if (title)
                createPlaylist(title);
            }
            else title = playlistSelector.value;

            if (title)
              addToCollection(title, store.actionsMenu);

            close();
            playlistSelector.selectedIndex = 0;
          }}
        >
          <option>Add To</option>
          <option value="+pl">Create New Playlist</option>
          <option value="favorites">Favorites</option>
          <option value="listenLater">Listen Later</option>
        </select>
      </li>

      <li on:click={async () => {
        close();
        fetchList('/playlists/RD' + store.actionsMenu.id, true);
      }}>
        <i class="ri-radio-line"></i>Start Radio
      </li>

      <li on:click={async () => {
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
            aFormat: (await store.player.supportsOpus) ? 'opus' : 'mp3',
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

      <li on:click={() => {
        close();
        const smd = store.actionsMenu;
        (document.getElementById('viewOnYTBtn') as HTMLButtonElement).innerHTML = '<i class="ri-external-link-line"></i> ' + smd.author;
        fetchList(smd.channelUrl);
      }}>
        <i class="ri-youtube-line"></i>View Channel
      </li>

    </ul>
  )
}
