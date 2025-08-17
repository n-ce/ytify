import fetchList from '../../../lib/modules/fetchList';
import { setStore, store, closeDialog, t, playerStore } from '../../../lib/stores';
import { config, getDownloadLink, hostResolver } from '../../../lib/utils';
import './ActionsMenu.css';
import CollectionSelector from "./CollectionSelector";
import { Show } from 'solid-js';


export default function(_: {
  data: CollectionItem
}) {


  const isMusic = _.data.author.endsWith('- Topic');
  let dialog!: HTMLDialogElement;

  return (
    <dialog
      id="actionsMenu"
      ref={dialog}
    >

      <ul
        onclick={(e: Event) => e.stopPropagation()}
      >

        <li tabindex="0" onclick={() => {
          // store.queue.append(store.actionsMenu, true);
          closeDialog();
        }}>
          <i class="ri-skip-forward-line"></i>{t('actions_menu_play_next')}
        </li>

        <li tabindex="1" onclick={() => {
          // store.queue.append(store.actionsMenu);
          closeDialog();
        }}>
          <i class="ri-list-check-2"></i>{t('actions_menu_enqueue')}
        </li>

        <CollectionSelector
          collection={_.data}
          close={closeDialog}
        />

        <Show when={config['part Start Radio']}>

          <li tabindex="3" onclick={async () => {
            closeDialog();
            fetchList('/playlists/RD' + _.data.id, true);
          }}>
            <i class="ri-radio-line"></i>{t('actions_menu_start_radio')}
          </li>
        </Show>


        <li tabindex="4" onclick={async () => {
          closeDialog();
          //loadingScreen.showModal();
          const a = document.createElement('a');
          const l = await getDownloadLink(_.data.id);
          if (l) {
            a.href = l;
            a.click();
          }
          //loadingScreen.close();
        }}>
          <i class="ri-download-2-fill"></i>{t('actions_menu_download')}
        </li>


        <Show when={config['part View Author']}>

          <li tabindex="5" onclick={() => {
            closeDialog();
            setStore('list', 'name',
              _.data.author.endsWith('- Topic') ?
                ('Artist - ' + _.data.author.replace('- Topic', ''))
                : '');

            fetchList(_.data.channelUrl);
          }}>

            <i class="ri-user-3-line"></i>
            {t(isMusic ?
              'actions_menu_view_artist' :
              'actions_menu_view_channel')
            }
          </li>
        </Show>


        {isMusic ?

          <li tabindex="6" onclick={() => {
            closeDialog();
            setStore('features', 'lyrics', true);
          }
          }>
            <i class="ri-music-2-line"></i>{t('actions_menu_view_lyrics')}
          </li>
          :
          <Show when={config['part Watch On']}>

            <li tabindex="6" onclick={() => {
              closeDialog();
              if (config.linkHost)
                open(hostResolver('/watch?v=' + _.data.id));
              else {
                setStore('features', 'video', true);
              }
            }}>
              <i class="ri-video-line"></i>{t('actions_menu_watch_on', store.linkHost.slice(8))}
            </li>
          </Show>
        }


        <li tabindex="7" onclick={() => {
          closeDialog();

          const output = location.pathname === '/' ? playerStore.data : _.data;

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
