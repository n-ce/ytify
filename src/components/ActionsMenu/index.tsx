// import fetchList from '../../../lib/modules/fetchList';

import { store, t, playerStore, setListStore, setNavStore, setQueueStore, setStore } from '../../lib/stores';
import { config, getDownloadLink, hostResolver } from '../../lib/utils';
import './ActionsMenu.css';
import CollectionSelector from "./CollectionSelector";
import { onMount, Show } from 'solid-js';


export default function() {

  const { id, author } = store.actionsMenu;
  const isMusic = author.endsWith('- Topic');
  let dialog!: HTMLDialogElement;

  function closeDialog() {
    dialog.close();
    setStore('actionsMenu', 'id', '');
  }
  onMount(() => {
    dialog.showModal();
  });

  return (
    <dialog
      id="actionsMenu"
      ref={dialog}
      onclick={closeDialog}
    >

      <ul
        onclick={(e: Event) => e.stopPropagation()}
      >

        <li tabindex="0" onclick={() => {

          setNavStore('queue', 'state', true);
          setQueueStore('list', list => [store.actionsMenu, ...list]);

        }}>
          <i class="ri-skip-forward-line"></i>{t('actions_menu_play_next')}
        </li>

        <li tabindex="1" onclick={() => {
          setNavStore('queue', 'state', true);
          setQueueStore('list', list => [...list, store.actionsMenu]);
          closeDialog();
        }}>
          <i class="ri-list-check-2"></i>{t('actions_menu_enqueue')}
        </li>

        <CollectionSelector close={closeDialog} />

        <li tabindex="3" onclick={async () => {
          closeDialog();
          //fetchList('/playlists/RD' + _.data.id, true);
        }}>
          <i class="ri-radio-line"></i>{t('actions_menu_start_radio')}
        </li>




        <li tabindex="4" onclick={async () => {

          closeDialog();
          setStore('snackbar', t('actions_menu_download_init'));
          const a = document.createElement('a');
          const l = await getDownloadLink(id);
          if (l) {
            a.href = l;
            a.click();
          }
        }}>
          <i class="ri-download-2-fill"></i>
          {t('actions_menu_download')}
        </li>

        <li tabindex="5" onclick={() => {
          closeDialog();
          setListStore('name',
            author.endsWith('- Topic') ?
              ('Artist - ' + author.replace('- Topic', ''))
              : '');

          //fetchList(_.data.channelUrl);
        }}>

          <i class="ri-user-3-line"></i>
          {t(isMusic ?
            'actions_menu_view_artist' :
            'actions_menu_view_channel')
          }
        </li>




        <Show when={isMusic}>
          <li tabindex="6" onclick={() => {
            closeDialog();
            setNavStore('lyrics', 'state', true);
          }
          }>
            <i class="ri-music-2-line"></i>{t('actions_menu_view_lyrics')}
          </li>
        </Show>

        <Show when={!isMusic}>
          <li tabindex="6" onclick={() => {
            closeDialog();
            if (config.linkHost)
              open(hostResolver('/watch?v=' + id));
            else
              setNavStore('video', 'state', true);
          }}>
            <i class="ri-video-line"></i>{t('actions_menu_watch_on', store.linkHost.slice(8))}
          </li>

        </Show>



        <li tabindex="7" onclick={() => {
          closeDialog();

          const output = location.pathname === '/' ? playerStore.data : store.actionsMenu;

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
          <i class="ri-braces-line"></i>{t('actions_menu_debug_info')}
        </li>
      </ul>
    </dialog>
  );


}
