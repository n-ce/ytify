// import fetchList from '../../../lib/modules/fetchList';

import { store, t, playerStore, setListStore, setNavStore, setQueueStore, setStore } from '@lib/stores';
import { config, getDownloadLink, hostResolver } from '@lib/utils';
import './ActionsMenu.css';
import CollectionSelector from "./CollectionSelector";
import { onMount, Show } from 'solid-js';


export default function() {

  const isMusic = store.actionsMenu?.author.endsWith('- Topic');
  let dialog!: HTMLDialogElement;

  function closeDialog() {
    dialog.close();
    setStore('actionsMenu', undefined);
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
          const { actionsMenu } = store;
          if (actionsMenu)
            setQueueStore('list', list => [actionsMenu, ...list]);

          closeDialog();
        }}>
          <i class="ri-skip-forward-line"></i>{t('actions_menu_play_next')}
        </li>

        <li tabindex="1" onclick={() => {
          const { actionsMenu } = store;
          if (actionsMenu)
            setQueueStore('list', list => [...list, actionsMenu]);
          closeDialog();
        }}>
          <i class="ri-list-check-2"></i>{t('actions_menu_enqueue')}
        </li>

        <CollectionSelector close={closeDialog} />

        <li tabindex="3" onclick={async () => {
          //fetchList('/playlists/RD' + _.data.id, true);
          closeDialog();
        }}>
          <i class="ri-radio-line"></i>{t('actions_menu_start_radio')}
        </li>



        <li tabindex="4" onclick={() => {
          const id = store?.actionsMenu?.id;


          if (!id) {
            setStore('snackbar', 'id not found');
            return;
          }
          getDownloadLink(id);
          closeDialog();
        }}>
          <i class="ri-download-2-fill"></i>
          {t('actions_menu_download')}
        </li>

        <li tabindex="5" onclick={() => {
          const author = store.actionsMenu?.author;
          if (!author) return;
          setListStore('name',
            author.endsWith('- Topic') ?
              ('Artist - ' + author.replace('- Topic', ''))
              : '');

          closeDialog();
          //fetchList(_.data.channelUrl);
        }}>

          <i class="ri-user-3-line"></i>
          {t(isMusic ?
            'actions_menu_view_artist' :
            'actions_menu_view_channel')
          }
        </li>

        <Show when={store.actionsMenu?.albumId}>

          <li tabindex="6" onclick={() => {
          }}>
            <i class="ri-album-fill"></i>View Album
          </li>

        </Show>



        <Show when={!isMusic}>
          <li tabindex="6" onclick={() => {
            const id = store.actionsMenu?.id;
            if (config.linkHost && id)
              open(hostResolver('/watch?v=' + id));
            else
              setNavStore('video', 'state', true);
            closeDialog();
          }}>
            <i class="ri-video-line"></i>{t('actions_menu_watch_on', store.linkHost.slice(8))}
          </li>

        </Show>



        <li tabindex="7" onclick={() => {

          const output = store.actionsMenu || playerStore.data;
          const p = <p>{JSON.stringify(output, null, 4)}</p>;
          setStore('dialog', p);
          (document.querySelector('.displayer') as HTMLDialogElement).showModal();
          closeDialog();

        }}>
          <i class="ri-braces-line"></i>{t('actions_menu_debug_info')}
        </li>
      </ul>
    </dialog>
  );


}
