import { createStore } from "solid-js/store";
import { closeFeature, navStore, setNavStore, updateParam, setStore, store } from "@stores";
import { getLibraryAlbums, drawer } from "@utils";

const initialState = () => ({
  isLoading: false,
  isSubscribed: false,
  isSortable: false,
  isReversed: false,
  isShared: false,
  list: [] as YTItem[],
  length: 0,
  reservedCollections: ['history', 'favorites', 'liked', 'listenLater', 'channels', 'playlists'],
  name: '',
  url: '',
  type: 'collection' as 'channels' | 'playlists' | 'collection' | 'album',
  id: '',
  page: 1,
  author: '',
  img: '',
  hasContinuation: false,
  artistAlbums: [] as YTAlbumItem[],
  observer: { disconnect() { } } as IntersectionObserver
});

export const [listStore, setListStore] = createStore(initialState());

export async function getList(
  id: string,
  type: 'playlist' | 'channel' | 'album' | 'artist',
  all?: boolean
) {
  setListStore('hasContinuation', false);
  setListStore('isLoading', true);
  if (navStore.list.state)
    navStore.list.ref?.scrollIntoView();
  else
    setNavStore('list', 'state', true);

  if (!all) updateParam(type, id);

  // Special case for saved albums
  if (!all && type === 'playlist' && id.startsWith('OLAK5uy')) {
    const libraryAlbums = getLibraryAlbums();
    const savedAlbum = libraryAlbums.find(a => a.id === id);
    if (savedAlbum) {
      setListStore({
        img: savedAlbum.img,
        id: id,
        url: id,
        type: 'playlists',
        name: savedAlbum.name,
        author: savedAlbum.author,
        list: []
      });
      // Continue to fetch from API to get fresh tracks
    }
  }

  try {
    const res = await fetch(`${store.api}/api/${type}?id=${id}${all ? '&all=true' : ''}`);
    if (!res.ok) throw new Error(`Failed to fetch ${type}`);
    const data = await res.json() as YTListItem;

    if (data.type === 'artist') {
      const artist = data as YTArtistItem;
      const contextId = 'Artist - ' + artist.name;
      setListStore({
        name: contextId,
        id: id,
        type: 'channels',
        url: id,
        img: artist.img,
        list: (artist.items || []).map(v => ({
          ...v,
          author: v.author.endsWith(' - Topic') ? v.author : `${v.author} - Topic`,
          context: { src: 'channels' as const, id: contextId }
        }) as YTItem),
        artistAlbums: artist.albums
      });
    } else {
      const listData = data as (YTPlaylistItem | YTChannelItem | YTAlbumItem);
      const isChannel = data.type === 'channel';
      const listType = isChannel ? 'channels' : (data.type === 'album' ? 'album' : 'playlists');

      setListStore({
        name: listData.name,
        img: listData.img,
        id: id,
        author: 'author' in listData ? (listData as YTPlaylistItem | YTAlbumItem).author || '' : listData.name,
        type: listType,
        url: id,
        hasContinuation: 'hasContinuation' in listData ? (listData as YTPlaylistItem).hasContinuation : false,
        list: (listData.items || []).map(v => ({
          ...v,
          author: (data.type === 'album' && !v.author.endsWith(' - Topic')) ? `${v.author} - Topic` : v.author,
          context: { src: listType as Context, id: listData.name }
        }) as YTItem)
      });
    }
  } catch (e) {
    setStore('snackbar', e instanceof Error ? e.message : 'Unknown error');
    resetList();
  }

  setListStore('isLoading', false);
}

export function resetList() {
  setNavStore(drawer.lastMainFeature as 'search' | 'library', 'state', true);
  closeFeature('list');
  listStore.observer.disconnect();

  updateParam('collection');
  updateParam('playlist');
  updateParam('channel');
  updateParam('artist');
  updateParam('album');
  setListStore(initialState());
}

export function loadAll() {
  const { id, type } = listStore;
  if (type === 'playlists') {
    getList(id, 'playlist', true);
  }
}
