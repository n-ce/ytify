import { store, t, playerStore, setListStore, setStore, getList, addToQueue, navStore, setNavStore } from '@lib/stores';
import { getDownloadLink } from '@lib/utils';
import { addToCollection, getCollection, removeFromCollection } from '@lib/utils/library';
import './ActionsMenu.css';
import { onMount, Show, createEffect, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { LikeButton } from '@components/MediaPartials';
import CollectionSelector from './CollectionSelector';
import StreamItem from '@components/StreamItem';


export default function() {

  const isMusic = store.actionsMenu?.author?.endsWith('- Topic');
  let dialog!: HTMLDialogElement;

  function closeDialog() {
    dialog.close();
    setStore('actionsMenu', undefined);
  }
  onMount(() => {
    dialog.showModal();
  });

  const [isListenLater, setIsListenLater] = createSignal(false);
  createEffect(() => {
    const { id } = store.actionsMenu as CollectionItem;
    if (id)
      setIsListenLater(getCollection('listenLater').includes(id));
  })


  return (
    <dialog
      id="actionsMenu"
      ref={dialog}
      onclick={closeDialog}
    >
      <StreamItem
        id={store.actionsMenu?.id || ''}
        title={store.actionsMenu?.title || ''}
        author={store.actionsMenu?.author}
        duration={store.actionsMenu?.duration || ''}
        context={{
          src: 'queue', /* only for invoking  humbnail  cropping*/
          id: '1'
        }}
      />

      <ul
        onclick={(e: Event) => e.stopPropagation()}
      >
        <li class="clxnShelf" tabindex="-1">
          <LikeButton />
          <i
            aria-label='Listen Later'
            class={`ri-calendar-schedule-${isListenLater() ? 'fill' : 'line'}`}
            onclick={() => {
              const { actionsMenu } = store;
              if (actionsMenu) {
                if (isListenLater())
                  removeFromCollection('listenLater', [actionsMenu.id]);
                else
                  addToCollection('listenLater', [actionsMenu]);

                setIsListenLater(!isListenLater());
              }
            }}
          ></i>
          <i aria-label="Add to Collection">
            <CollectionSelector close={closeDialog} data={[store.actionsMenu as CollectionItem]} />
          </i>
        </li>

        <li tabindex="0" onclick={() => {
          const { actionsMenu } = store;
          if (actionsMenu)
            addToQueue([actionsMenu], { prepend: true });

          closeDialog();
        }}>
          <i class="ri-skip-forward-line"></i>{t('actions_menu_play_next')}
        </li>

        <li tabindex="1" onclick={() => {
          const { actionsMenu } = store;
          if (actionsMenu)
            addToQueue([actionsMenu]);
          closeDialog();
        }}>
          <i class="ri-list-check-2"></i>{t('actions_menu_enqueue')}
        </li>

        <li tabindex="3" onclick={async () => {
          if (navStore.queue.state)
            navStore.queue.ref?.scrollIntoView();
          else setNavStore('queue', 'state', true);
          getList('RD' + store?.actionsMenu?.id, 'mix');
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
          const { author, authorId } = store.actionsMenu as CollectionItem;

          if (author)
            setListStore('name',
              author.endsWith('- Topic') ?
                ('Artist - ' + author.replace('- Topic', ''))
                : '');

          if (authorId)
            getList(authorId, isMusic ? 'artist' : 'channel');

          closeDialog();
        }}>

          <i class="ri-user-3-line"></i>
          {t(isMusic ?
            'actions_menu_view_artist' :
            'actions_menu_view_channel')
          }
        </li>

        <Show when={store.actionsMenu?.albumId}>

          <li tabindex="6" onclick={() => {
            const albumId = store.actionsMenu?.albumId;
            if (albumId) {
              getList(albumId, 'album');
            }
            closeDialog();
          }}>
            <i class="ri-album-fill"></i>View Album
          </li>

        </Show>



        <li tabindex="7" onclick={() => {

          const output = store.actionsMenu || playerStore.data;
          const P = () => {
            let z!: HTMLDialogElement;
            onMount(() => {
              z.showModal();
            })
            return (
              <dialog
                onclick={() => {
                  z.close();
                  z.remove();
                }}
                ref={z} class="displayer">
                <p>{JSON.stringify(output, null, 4)}</p>
              </dialog>
            );
          }
          render(() => <P />, document.body);

          closeDialog();

        }}>
          <i class="ri-braces-line"></i>{t('actions_menu_debug_info')}
        </li>
      </ul >
    </dialog >
  );


}
