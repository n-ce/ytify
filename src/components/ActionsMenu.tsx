import './actionsMenu.css';
import { setStore, state, store } from "../lib/store";
import { getDownloadLink, hostResolver, i18n } from "../lib/utils";
import CollectionSelector from "./CollectionSelector";
import fetchList from "../modules/fetchList";
import { createSignal, Show } from 'solid-js';
import { Portal } from 'solid-js/web';


export default function() {


  const isMusic = store.actionsMenu.author.endsWith('- Topic');
  const [show, setShow] = createSignal(false);


  return (
    <>
      <i
        class="ri-more-2-fill"
        onclick={() => {
          history.pushState({}, '', '#');
          setShow(true);
        }}
      ></i>
      <Show when={show()}>
        <Portal mount={document.body} >

          <ul
            id="actionsMenu"
            onclick={(e: Event) => e.stopPropagation()}
          >

            <li tabindex="0" onclick={() => {
              // store.queue.append(store.actionsMenu, true);
              setShow(false);
            }}>
              <i class="ri-skip-forward-line"></i>{i18n('actions_menu_play_next')}
            </li>

            <li tabindex="1" onclick={() => {
              // store.queue.append(store.actionsMenu);
              setShow(false);
            }}>
              <i class="ri-list-check-2"></i>${i18n('actions_menu_enqueue')}
            </li>

            <CollectionSelector
              collection={store.actionsMenu}
              close={() => setShow(false)}
            />

            <Show when={state['part Start Radio']}>

              <li tabindex="3" onclick={async () => {
                setShow(false);
                fetchList('/playlists/RD' + store.actionsMenu.id, true);
              }}>
                <i class="ri-radio-line"></i>{i18n('actions_menu_start_radio')}
              </li>
            </Show>


            <li tabindex="4" onclick={async () => {
              setShow(false);
              //loadingScreen.showModal();
              const a = document.createElement('a');
              const l = await getDownloadLink(store.actionsMenu.id);
              if (l) {
                a.href = l;
                a.click();
              }
              //loadingScreen.close();
            }}>
              <i class="ri-download-2-fill"></i>${i18n('actions_menu_download')}
            </li>


            <Show when={state['part View Author']}>

              <li tabindex="5" onclick={() => {
                setShow(false);
                const smd = store.actionsMenu;
                setStore('list', 'name',
                  smd.author.endsWith('- Topic') ?
                    ('Artist - ' + smd.author.replace('- Topic', ''))
                    : '');

                fetchList(smd.channelUrl);
              }}>

                <i class="ri-user-3-line"></i>
                ${i18n(isMusic ?
                  'actions_menu_view_artist' :
                  'actions_menu_view_channel')
                }
              </li>
            </Show>


            {isMusic ?

              <li tabindex="6" onclick={() => {
                setShow(false);
                setStore('views', 'lyrics', true);
              }
              }>
                <i class="ri-music-2-line"></i>${i18n('actions_menu_view_lyrics')}
              </li>
              :
              <Show when={state['part Watch On']}>

                <li tabindex="6" onclick={() => {
                  setShow(false);
                  if (state.linkHost)
                    open(hostResolver('/watch?v=' + store.actionsMenu.id));
                  else {
                    setStore('views', 'watch', true);
                  }
                }}>
                  <i class="ri-video-line"></i>${i18n('actions_menu_watch_on', store.linkHost.slice(8))}
                </li>
              </Show>
            }


            <li tabindex="7" onclick={() => {
              setShow(false);

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
          </ul>
        </Portal >
      </Show>
    </>
  );


}
