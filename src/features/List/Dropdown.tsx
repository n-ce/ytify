import { Show, createEffect, createSignal } from 'solid-js';
import { deleteCollection, getLists, saveLists, getCollectionItems, renameCollection, getLibraryAlbums, saveAlbumToLibrary, removeAlbumFromLibrary, player } from '@utils';
import { listStore, resetList, setListStore, setStore, t, addToQueue, setQueueStore, setNavStore, setPlayerStore } from '@stores';

export default function Dropdown() {

  const [isSubscribed, setSubscribed] = createSignal(false);

  createEffect(() => {
    // Determine if the current list item is an album based on listStore.id or type
    const isAlbum = listStore.id.startsWith('MPREb') || listStore.type === 'album';

    if (isAlbum) {
      const albums = getLibraryAlbums();
      setSubscribed(albums.some(a => a.id === listStore.id)); // Check if listStore.id (album browseId) is in saved albums
    } else {
      // Existing logic for channels/playlists, using listStore.id
      setSubscribed(
        getLists(listStore.type as 'channels' | 'playlists').some(item => item.id === listStore.id)
      )
    }
  });


  function subscriptionHandler() {
    // Determine if the current list item is an album based on listStore.id or type
    const isAlbum = listStore.id.startsWith('MPREb') || listStore.type === 'album';

    if (isAlbum) {
      if (isSubscribed()) {
        removeAlbumFromLibrary(listStore.id); // Use listStore.id (album browseId) for removal
      } else {
        const albumData: Album = {
          name: listStore.name,
          author: listStore.author,
          img: listStore.img,
          id: listStore.id
        };
        saveAlbumToLibrary(listStore.id, albumData); // Use listStore.id (album browseId) for saving
      }
      setSubscribed(!isSubscribed());
      return;
    }

    // Existing playlist/channel logic
    const { name, type, id, author, img } = listStore;
    if (type === 'collection') return;

    let data = getLists(type as 'channels' | 'playlists');


    if (isSubscribed()) {
      data = data.filter(item => item.id !== id);
    }
    else {
      const dataset =
        {
          id,
          name,
          img
        } as Playlist;

      if (type === 'playlists')
        dataset.author = author;

      data.push(dataset);
    }

    saveLists(type as 'channels' | 'playlists', data);
    setSubscribed(!isSubscribed());
  }
  return (
    <details>
      <summary><i
        aria-label={t('settings_more_options')}
        class="ri-more-2-fill"></i></summary>
      <ul id="listTools">


        <li
          id="playAllBtn"
          onclick={() => {
            const fullList = listStore.type === 'collection' ? getCollectionItems(listStore.id) : listStore.list;
            if (!fullList.length) return;

            setQueueStore('history', []);
            setQueueStore('list', []);
            setPlayerStore('stream', fullList[0]);
            addToQueue(fullList.slice(1));
            player(fullList[0].id);

            setNavStore('queue', 'state', false);
            setNavStore('queue', 'state', true);
          }}
        >
          <i class="ri-play-large-line"></i>{t("list_play")}
        </li>

        <li onclick={() => {
          const fullList = listStore.type === 'collection' ? getCollectionItems(listStore.id) : listStore.list;
          setQueueStore('history', []);
          addToQueue(fullList);
          setNavStore('queue', 'state', false);
          setNavStore('queue', 'state', true);
        }}>
          <i class="ri-list-check-2"></i>{t("list_enqueue")}
        </li>

        <Show when={listStore.type !== 'collection' || listStore.isShared}>
          <li onclick={() => import('@modules/listUtils').then(mod => mod.importList())}>
            <i class="ri-import-line"></i>{t("list_import")}
          </li>
        </Show>

        {/* The Show condition below seems to be designed to enable the subscription button for both playlists and albums.
            Albums have type 'playlists' and their ID starts with 'OLAK5uy_'.
            Playlists have type 'playlists' but their ID typically starts with 'PL'.
            Channels have type 'channels'.
            The existing condition is:
            (listStore.type === 'channels' && !listStore.name.startsWith('Artist')) || listStore.type === 'playlists'
            This correctly covers both regular playlists and albums (which are 'playlists' type)
            and channels.
        */}
        <Show when={(listStore.type === 'channels' && !listStore.name.startsWith('Artist')) || listStore.type === 'playlists' || listStore.type === 'album'}>

          <li onclick={subscriptionHandler}>
            <i
              class={"ri-star-" + (isSubscribed() ? "fill" : "line")}></i>{isSubscribed() ? t('list_saved_to_library') : t('list_save_to_library')}
          </li>

          <li onclick={() => {
            const { type, id } = listStore;
            let url = '';

            if (id.startsWith('MPREb')) {
              url = 'muzo://album/' + id;
            } else if (type === 'playlists' || type === 'album' || id.startsWith('OLAK5uy')) {
              url = 'muzo://playlist/' + id;
            } else if (type === 'channels') {
              url = 'muzo://artist/' + id;
            }

            if (url) open(url);
          }}>
            <svg class="muzo-logo-icon" style="width: 1.3em; height: 1.3em;" viewBox="0 0 512 512" fill="currentColor">
              <g transform="translate(0,512) scale(0.1,-0.1)" stroke="none">
                <path d="M1663 3400 c-66 -15 -63 4 -63 -396 l0 -363 -22 -13 c-17 -10 -107 -14 -336 -18 -263 -4 -314 -7 -322 -20 -6 -9 -10 -174 -10 -397 0 -376 0 -382 21 -396 17 -13 69 -14 322 -11 195 3 306 9 314 16 10 8 13 80 13 330 0 260 3 324 15 347 14 29 33 41 63 41 19 0 102 -78 102 -97 0 -6 6 -16 14 -20 8 -4 38 -35 66 -68 29 -33 80 -91 115 -130 34 -38 79 -90 100 -115 20 -25 56 -67 79 -94 22 -27 57 -70 77 -96 20 -26 51 -62 70 -78 l35 -31 199 -2 200 -2 17 28 c13 22 16 42 11 90 -3 34 -2 182 2 329 7 266 7 268 30 278 33 15 65 4 105 -36 35 -34 58 -60 165 -191 32 -38 67 -79 80 -90 12 -11 35 -38 51 -60 16 -22 46 -57 67 -77 20 -20 37 -39 37 -43 0 -3 15 -21 33 -39 50 -52 80 -87 112 -133 17 -23 37 -46 45 -50 8 -4 170 -8 359 -10 299 -3 346 -2 367 12 l24 15 0 379 c0 467 16 426 -165 426 l-126 0 -47 51 c-109 116 -214 234 -281 314 -39 47 -85 102 -103 122 -18 20 -76 85 -128 145 -52 60 -108 120 -125 133 l-29 25 -211 -3 c-198 -3 -211 -4 -227 -24 -16 -18 -18 -49 -18 -327 0 -225 -3 -310 -12 -319 -7 -7 -29 -12 -50 -12 -40 0 -79 32 -143 116 -16 21 -55 66 -87 98 -32 33 -58 63 -58 68 0 4 -21 30 -47 56 -27 27 -57 60 -68 74 -11 14 -50 59 -87 99 -36 41 -81 91 -98 112 -18 21 -41 42 -51 48 -23 12 -352 20 -396 9z"/>
              </g>
            </svg>{t('actions_menu_yt_link')}
          </li>
        </Show>

        <Show when={listStore.type === 'collection' && listStore.isReversed}>
          <li id="clearListBtn">
            <i class="ri-close-large-line"></i>{t("list_clear_all")}
          </li>
        </Show>


        <Show when={listStore.type === 'collection' && !listStore.isReversed && !listStore.isShared}>

          <li id="deleteCollectionBtn" onclick={() => {
            const { id } = listStore;
            if (confirm(t("list_prompt_delete", id))) {
              deleteCollection(id);
              resetList();
            }
          }}>
            <i class="ri-delete-bin-2-line"></i>{t("list_delete")}
          </li>

          <li id="renameCollectionBtn" onclick={() => {
            const oldName = listStore.name;
            const newName = prompt(t('list_rename_prompt'), oldName);
            if (newName && newName !== oldName) {
              renameCollection(oldName, newName);
              setListStore('name', newName);
              setListStore('id', newName);
              setStore('snackbar', t('list_rename_success'));
            }
          }}>
            <i class="ri-edit-line"></i>{t("list_rename")}
          </li>

          <li id="shareCollectionBtn" onclick={() => import('@modules/listUtils').then(mod => mod.shareCollection(getCollectionItems(listStore.id)))}>
            <i class="ri-link"></i>{t("list_share")}
          </li>

          <li id="exportCollectionBtn" onclick={() => {
            const collectionData: TrackItem[] = getCollectionItems(listStore.id);
            console.log(collectionData);
            const jsonString = JSON.stringify(collectionData, null, 2);
            navigator.clipboard.writeText(jsonString)
              .then(() => {
                setStore('snackbar', t('list_export_success'));
              })
              .catch((err) => {
                setStore('snackbar', t('list_export_error') + err);
              });
          }}>
            <i class="ri-export-line"></i>{t('list_export')}
          </li>

        </Show>
      </ul>
    </details>
  )
}
