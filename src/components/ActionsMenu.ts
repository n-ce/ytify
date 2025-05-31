import './ActionsMenu.css';
import { html, render } from "uhtml";
import { loadingScreen, openInYtBtn } from "../lib/dom";
import { state, store } from "../lib/store";
import { getDownloadLink, hostResolver } from "../lib/utils";
import CollectionSelector from "./CollectionSelector";
import fetchList from "../modules/fetchList";
import { i18n } from '../scripts/i18n';


export default function(dialog: HTMLDialogElement) {

  const isMusic = store.actionsMenu.author.endsWith('- Topic');

  function close() {
    dialog.close();
    history.back();
    dialog.remove();
  }

  dialog.id = 'actionsMenu';
  dialog.onclick = close;
  dialog.showModal();
  history.pushState({}, '', '#');


  render(dialog, html`
    <ul @click=${(e: Event) => e.stopPropagation()}>

      <li tabindex="0" @click=${() => {
      store.queue.append(store.actionsMenu, true);
      close();
    }}>
        <i class="ri-skip-forward-line"></i>${i18n('actions_menu_play_next')}
      </li>

      <li tabindex="1" @click=${() => {
      store.queue.append(store.actionsMenu);
      close();
    }}>
        <i class="ri-list-check-2"></i>${i18n('actions_menu_enqueue')}
      </li>

      ${CollectionSelector(
      { collection: store.actionsMenu, close }
    )}

      ${state['part Start Radio'] ?
      html`
        <li tabindex="3" @click=${async () => {
          close();
          fetchList('/playlists/RD' + store.actionsMenu.id, true);
        }}>
          <i class="ri-radio-line"></i>${i18n('actions_menu_start_radio')}
        </li>
        `: ''}

      
      <li tabindex="4" @click=${async () => {
      close();
      loadingScreen.showModal();
      const a = document.createElement('a');
      const l = await getDownloadLink(store.actionsMenu.id);
      if (l) {
        a.href = l;
        a.click();
      }
      loadingScreen.close();
    }}>
        <i class="ri-download-2-fill"></i>${i18n('actions_menu_download')}
      </li>

      
      ${state['part View Author'] ?
      html`
        <li tabindex="5" @click=${() => {
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

          <i class="ri-user-3-line"></i>
          ${i18n(isMusic ?
          'actions_menu_view_artist' :
          'actions_menu_view_channel')
        }
        </li>
      `: ''}


      ${isMusic ?

      html`
        <li tabindex="6" @click=${() => {
          close();
          const dialog = document.createElement('dialog');
          dialog.className = 'displayer';
          dialog.addEventListener('click', () => {
            dialog.close();
            dialog.remove();
            store.lrcSync = () => '';
          });
          document.body.appendChild(dialog);
          import('./Lyrics')
            .then(mod => mod.default(dialog))
        }
        }>
          <i class="ri-music-2-line"></i>${i18n('actions_menu_view_lyrics')}
        </li>
        `:

      state['part Watch On'] ?
        html`
          <li tabindex="6" @click=${() => {
            close();
            if (state.linkHost)
              open(hostResolver('/watch?v=' + store.actionsMenu.id));
            else {

              const dialog = document.createElement('dialog');
              dialog.open = true;
              dialog.className = 'watcher';
              document.body.appendChild(dialog);
              import('./WatchVideo')
                .then(mod => mod.default(dialog));
            }
          }}>
            <i class="ri-video-line"></i>${i18n('actions_menu_watch_on', store.linkHost.slice(8))}
          </li>
          `: ''}

      
      <li tabindex="7" @click=${() => {
      close();

      const output = location.pathname === '/' ? store.player.data : store.actionsMenu;
      const displayer = document.createElement('dialog');
      displayer.className = 'displayer';
      displayer.addEventListener('click', () => {
        displayer.close();
        displayer.remove();
      });
      displayer.textContent = JSON.stringify(output, null, 4);
      document.body.appendChild(displayer);
      displayer.showModal();

    }}>
        <i class="ri-braces-line"></i>${i18n('actions_menu_debug_info')}
      </li>


     `);


}
