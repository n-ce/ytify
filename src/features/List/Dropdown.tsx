import { Show, createEffect, createSignal } from 'solid-js';
import { deleteCollection, getLists, saveLists, getCollectionItems, renameCollection, getLibraryAlbums, saveAlbumToLibrary, removeAlbumFromLibrary } from '@lib/utils/library';
import { getThumbIdFromLink } from '@lib/utils/image';
import { listStore, resetList, setPlayerStore, setStore, t, addToQueue, setNavStore, setListStore, setQueueStore } from '@lib/stores';
import { importList, shareCollection } from '@lib/modules/listUtils';
import { player } from '@lib/utils';

export default function Dropdown(_: {
  toggleSort: () => void
}) {

  const [isSubscribed, setSubscribed] = createSignal(false);

  createEffect(() => {
    // Determine if the current list item is an album based on listStore.id
    const isAlbum = listStore.id.startsWith('OLAK5uy_'); // Album IDs start with OLAK5uy

    if (isAlbum) {
      const albums = getLibraryAlbums();
      setSubscribed(listStore.id in albums); // Check if listStore.id (album browseId) is in saved albums
    } else {
      // Existing logic for channels/playlists, using listStore.id
      setSubscribed(
        getLists(listStore.type as 'channels' | 'playlists').some(item => item.id === listStore.id)
      )
    }
  });


  function subscriptionHandler() {
    // Determine if the current list item is an album based on listStore.id
    const isAlbum = listStore.id.startsWith('OLAK5uy_'); // Album IDs start with OLAK5uy

    if (isAlbum) {
      if (isSubscribed()) {
        removeAlbumFromLibrary(listStore.id); // Use listStore.id (album browseId) for removal
      } else {
        const albumData: Album = {
          name: listStore.name,
          artist: listStore.uploader,
          thumbnail: getThumbIdFromLink(listStore.thumbnail),
          tracks: listStore.list.map(t => t.id)
        };
        saveAlbumToLibrary(listStore.id, albumData, listStore.list); // Use listStore.id (album browseId) for saving
      }
      setSubscribed(!isSubscribed());
      return;
    }

    // Existing playlist/channel logic
    const { name, type, id, uploader, thumbnail } = listStore;
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
          thumbnail: getThumbIdFromLink(thumbnail)
        } as Playlist;

      if (type === 'playlists')
        dataset.uploader = uploader;

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
            setQueueStore('list', []);
            const fullList = listStore.type === 'collection' ? getCollectionItems(listStore.id) : listStore.list;
            addToQueue(fullList);
            setPlayerStore('stream', fullList[0]);
            player(fullList[0].id);
            setNavStore('queue', 'state', true);
          }}
        >
          <i class="ri-play-large-line"></i>{t("list_play")}
        </li>

        <li id="enqueueAllBtn" onclick={() => {
          const fullList = listStore.type === 'collection' ? getCollectionItems(listStore.id) : listStore.list;
          addToQueue(fullList);
          setNavStore('queue', 'state', true);
        }}>
          <i class="ri-list-check-2"></i>{t("list_enqueue")}
        </li>

        <li onclick={importList} id="importListBtn">
          <i class="ri-import-line"></i>{t("list_import")}
        </li>

        {/* The Show condition below seems to be designed to enable the subscription button for both playlists and albums.
            Albums have type 'playlists' and their ID starts with 'OLAK5uy_'.
            Playlists have type 'playlists' but their ID typically starts with 'PL'.
            Channels have type 'channels'.
            The existing condition is:
            (listStore.type === 'channels' && !listStore.name.startsWith('Artist')) || listStore.type === 'playlists'
            This correctly covers both regular playlists and albums (which are 'playlists' type)
            and channels.
        */}
        <Show when={(listStore.type === 'channels' && !listStore.name.startsWith('Artist')) || listStore.type === 'playlists'}>

          <li
            id="subscribeListBtn"
            onclick={subscriptionHandler}
          >
            <i
              class={"ri-star-" + (isSubscribed() ? "fill" : "line")}></i>{isSubscribed() ? t('list_saved_to_library') : t('list_save_to_library')}
          </li>

          <li id="viewOnYTBtn">
            <i class="ri-external-link-line"></i>{listStore.name || t('list_view_on_yt')}
          </li>
        </Show>

        <Show when={listStore.type === 'collection' && listStore.isReversed}>
          <li id="clearListBtn">
            <i class="ri-close-large-line"></i>{t("list_clear_all")}
          </li>
        </Show>


        <Show when={listStore.type === 'collection' && !listStore.isReversed}>

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

          <li id="shareCollectionBtn" onclick={() => shareCollection(getCollectionItems(listStore.id))}>
            <i class="ri-link"></i>{t("list_share")}
          </li>

          <li id="exportCollectionBtn" onclick={() => {
            const collectionData: CollectionItem[] = getCollectionItems(listStore.id);
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

          <li id="radioCollectionBtn">
            <i class="ri-radio-line"></i>{t("list_radio")}
          </li>

          <li
            id="sortCollectionBtn"
            onclick={_.toggleSort}
          >
            <i class="ri-draggable"></i>{t("list_sort")}
          </li>

        </Show>
      </ul>
    </details>
  )
}
