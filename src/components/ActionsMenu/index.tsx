import { getDownloadLink, addToCollection, getCollection, removeFromCollection } from '@utils';
import './ActionsMenu.css';
import { onMount, Show, createEffect, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { LikeButton } from '@components/MediaPartials';
import CollectionSelector from './CollectionSelector';
import StreamItem from '@components/StreamItem';
import { setStore, store, t, playerStore, getList, setListStore, addToQueue, queueStore, setQueueStore, setNavStore } from '@stores';


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
            addToQueue([{
              ...actionsMenu,
              context: { src: '', id: Date.now().toString() }
            }], { prepend: true });

          closeDialog();
        }}>
          <i class="ri-skip-forward-fill"></i>{t('player_play_next')}
        </li>

        <li tabindex="1" onclick={() => {
          const { actionsMenu } = store;
          if (actionsMenu)
            addToQueue([{
              ...actionsMenu,
              context: { src: '', id: Date.now().toString() }
            }]);
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
              setNavStore('queue', 'state', false);
              setNavStore('queue', 'state', true);
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
          open('muzo://s/' + store.actionsMenu?.id);
        }}>
          <svg class="muzo-logo-icon" style="width: 1.3em; height: 1.3em;" viewBox="0 0 512 512" fill="currentColor">
            <g transform="translate(0,512) scale(0.1,-0.1)" stroke="none">
              <path d="M1663 3400 c-66 -15 -63 4 -63 -396 l0 -363 -22 -13 c-17 -10 -107 -14 -336 -18 -263 -4 -314 -7 -322 -20 -6 -9 -10 -174 -10 -397 0 -376 0 -382 21 -396 17 -13 69 -14 322 -11 195 3 306 9 314 16 10 8 13 80 13 330 0 260 3 324 15 347 14 29 33 41 63 41 19 0 102 -78 102 -97 0 -6 6 -16 14 -20 8 -4 38 -35 66 -68 29 -33 80 -91 115 -130 34 -38 79 -90 100 -115 20 -25 56 -67 79 -94 22 -27 57 -70 77 -96 20 -26 51 -62 70 -78 l35 -31 199 -2 200 -2 17 28 c13 22 16 42 11 90 -3 34 -2 182 2 329 7 266 7 268 30 278 33 15 65 4 105 -36 35 -34 58 -60 165 -191 32 -38 67 -79 80 -90 12 -11 35 -38 51 -60 16 -22 46 -57 67 -77 20 -20 37 -39 37 -43 0 -3 15 -21 33 -39 50 -52 80 -87 112 -133 17 -23 37 -46 45 -50 8 -4 170 -8 359 -10 299 -3 346 -2 367 12 l24 15 0 379 c0 467 16 426 -165 426 l-126 0 -47 51 c-109 116 -214 234 -281 314 -39 47 -85 102 -103 122 -18 20 -76 85 -128 145 -52 60 -108 120 -125 133 l-29 25 -211 -3 c-198 -3 -211 -4 -227 -24 -16 -18 -18 -49 -18 -327 0 -225 -3 -310 -12 -319 -7 -7 -29 -12 -50 -12 -40 0 -79 32 -143 116 -16 21 -55 66 -87 98 -32 33 -58 63 -58 68 0 4 -21 30 -47 56 -27 27 -57 60 -68 74 -11 14 -50 59 -87 99 -36 41 -81 91 -98 112 -18 21 -41 42 -51 48 -23 12 -352 20 -396 9z"/>
            </g>
          </svg>{t('actions_menu_yt_link')}
        </li>

      </ul >
    </dialog >
  );


}
