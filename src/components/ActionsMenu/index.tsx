import { getDownloadLink, addToCollection, getCollection, removeFromCollection } from '@utils';
import './ActionsMenu.css';
import { onMount, Show, createEffect, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { LikeButton } from '@components/MediaPartials';
import CollectionSelector from './CollectionSelector';
import StreamItem from '@components/StreamItem';
import { setStore, store, t, playerStore, getList, setListStore, addToQueue, queueStore, setQueueStore, navStore, setNavStore } from '@stores';


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
  const [isDownloading, setIsDownloading] = createSignal(false);
  const [isViewingAuthor, setIsViewingAuthor] = createSignal(false);
  const [isViewingAlbum, setIsViewingAlbum] = createSignal(false);

  createEffect(() => {
    const { id } = store.actionsMenu as TrackItem;
    if (id)
      setIsListenLater(getCollection('listenLater').includes(id));
  })


  return (
    <dialog
      id="actionsMenu"
      ref={dialog}
      onclick={() => !isDownloading() && !isViewingAuthor() && !isViewingAlbum() && closeDialog()}
    >
      <StreamItem
        id={store.actionsMenu?.id || ''}
        title={store.actionsMenu?.title || ''}
        authorId={store.actionsMenu?.authorId || ''}
        author={store.actionsMenu?.author || ''}
        duration={store.actionsMenu?.duration || ''}
        type="video"
        context={store.actionsMenu?.context}
      />

      <ul
        onclick={(e: Event) => e.stopPropagation()}
      >
        <li class="clxnShelf" tabindex="-1">
          <LikeButton />
          <i
            aria-label={t('library_listen_later')}
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
          <i aria-label={t('collection_selector_add_to')}>
            <CollectionSelector close={closeDialog} data={[store.actionsMenu as TrackItem]} />
          </i>
        </li>

        <li tabindex="0" onclick={() => {
          const { actionsMenu } = store;
          if (actionsMenu)
            addToQueue([actionsMenu], { prepend: true, ignoreConfig: true });

          closeDialog();
        }}>
          <i class="ri-skip-forward-fill"></i>{t('player_play_next')}
        </li>

        <li tabindex="1" onclick={() => {
          const { actionsMenu } = store;
          if (actionsMenu)
            addToQueue([actionsMenu], { ignoreConfig: true });
          closeDialog();
        }}>
          <i class="ri-list-check-2"></i>{t('actions_menu_enqueue')}
        </li>

        <li tabindex="3" onclick={async () => {
          const id = store.actionsMenu?.id;
          const currentTitle = store.actionsMenu?.title;
          if (!id) return;

          setQueueStore('isLoading', true);
          import('@modules/getRadio')
            .then(mod => mod.default(id))
            .then(data => {
              setQueueStore('list', []);
              addToQueue(data.map(item => ({
                ...item,
                context: { src: 'queue', id: `Radio: ${currentTitle}` }
              })));
              if (navStore.queue.state)
                navStore.queue.ref?.scrollIntoView();
              else setNavStore('queue', 'state', true);
            })
            .catch(e => {
              setStore('snackbar', e instanceof Error ? e.message : 'Unknown error');
            })
            .finally(() => {
              setQueueStore('isLoading', false);
              closeDialog();
            });
        }}>
          <i class={queueStore.isLoading ? "ri-loader-3-line loading-spinner" : "ri-radio-line"}>
          </i>{t('actions_menu_start_radio')}
        </li>



        <li tabindex="4" onclick={async () => {
          if (isDownloading()) return;

          const id = store?.actionsMenu?.id;
          if (!id) {
            setStore('snackbar', t('actions_menu_id_not_found'));
            return;
          }

          setIsDownloading(true);
          try {
            await getDownloadLink(id);
          } finally {
            setIsDownloading(false);
            closeDialog();
          }
        }}>
          <i class={isDownloading() ? "ri-loader-3-line loading-spinner" : "ri-download-2-fill"}></i>
          {t(isDownloading() ? 'actions_menu_downloading' : 'actions_menu_download')}
        </li>

        <li tabindex="5" onclick={async () => {
          if (isViewingAuthor()) return;
          const { author, authorId } = store.actionsMenu as TrackItem;

          if (author)
            setListStore('name',
              author.endsWith('- Topic') ?
                ('Artist - ' + author.replace('- Topic', ''))
                : '');

          if (authorId) {
            setIsViewingAuthor(true);
            try {
              await getList(authorId, isMusic ? 'artist' : 'channel');
            } finally {
              setIsViewingAuthor(false);
              closeDialog();
            }
          }
        }}>

          <i class={isViewingAuthor() ? "ri-loader-3-line loading-spinner" : "ri-user-3-line"}></i>
          {t(isMusic ?
            'actions_menu_view_artist' :
            'actions_menu_view_channel')
          }
        </li>

        <Show when={store.actionsMenu?.albumId}>

          <li tabindex="6" onclick={async () => {
            if (isViewingAlbum()) return;
            const albumId = store.actionsMenu?.albumId;
            if (albumId) {
              setIsViewingAlbum(true);
              try {
                await getList(albumId, 'album');
              } finally {
                setIsViewingAlbum(false);
                closeDialog();
              }
            }
          }}>
            <i class={isViewingAlbum() ? "ri-loader-3-line loading-spinner" : "ri-album-fill"}></i>{t('actions_menu_view_album')}
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


        <li tabindex="8" onclick={() => {
          const id = store.actionsMenu?.id;
          if (id) {
            const shareUrl = location.origin + '/s/' + id;
            if (navigator.share) {
              navigator.share({
                title: store.actionsMenu?.title || 'Shared Link',
                url: shareUrl
              }).catch(console.error);
            } else {
              navigator.clipboard.writeText(shareUrl);
              setStore('snackbar', 'Link copied to clipboard');
            }
          }
          closeDialog();
        }}>
          <i class="ri-link"></i>{t('actions_menu_share')}
        </li>


        <li tabindex="9" onclick={() => {
          open('https://www.youtube.com/watch?v=' + store.actionsMenu?.id);
        }}>
          <i class="ri-youtube-fill"></i>{t('actions_menu_yt_link')}
        </li>

      </ul >
    </dialog >
  );


}
