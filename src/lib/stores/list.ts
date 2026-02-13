import { createStore } from "solid-js/store";
import { closeFeature, navStore, setNavStore, updateParam } from "./navigation";
import { setStore, store } from "./app";
import { getLibraryAlbums, getTracksMap, drawer } from "@lib/utils";

const initialState = () => ({
  isLoading: false,
  isSubscribed: false,
  isSortable: false,
  isReversed: false,
  isShared: false,
  list: [] as YTItem[],
  length: 0,
  reservedCollections: ['history', 'favorites', 'listenLater', 'channels', 'playlists'],
  name: '',
  url: '',
  type: 'collection' as 'channels' | 'playlists' | 'collection',
  id: '',
  page: 1,
  author: '',
  img: '',
  artistAlbums: [] as YTAlbumItem[],
  observer: { disconnect() { } } as IntersectionObserver
});

export const [listStore, setListStore] = createStore(initialState());

export async function getList(
  id: string,
  type: 'playlist' | 'channel' | 'album' | 'artist'
) {
  setListStore('isLoading', true);
  if (navStore.list.state)
    navStore.list.ref?.scrollIntoView();
  else
    setNavStore('list', 'state', true);

  // Special case for saved albums
  if (type === 'playlist' && id.startsWith('OLAK5uy')) {
    const libraryAlbums = getLibraryAlbums();
    if (id in libraryAlbums) {
      const savedAlbum = libraryAlbums[id];
      const tracksMap = getTracksMap();
      const albumTracks = savedAlbum.tracks.map(trackId => tracksMap[trackId]).filter((t): t is YTItem => !!t);

      setListStore({
        img: savedAlbum.img,
        id: id,
        url: id,
        type: 'playlists',
        name: savedAlbum.name,
        author: savedAlbum.author,
        list: albumTracks
      });
      setListStore('isLoading', false);
      return;
    }
  }

  try {
    const res = await fetch(`${store.api}/api/${type}?id=${id}`);
    if (!res.ok) throw new Error(`Failed to fetch ${type}`);
    const data = await res.json() as YTListItem;

    if (data.type === 'artist') {
      const artist = data as YTArtistItem;
      setListStore({
        name: 'Artist - ' + artist.name,
        id: id,
        type: 'channels',
        url: id,
        img: artist.img,
        list: (artist.items || []).map(v => ({
          ...v,
          author: v.author.endsWith(' - Topic') ? v.author : `${v.author} - Topic`
        }) as YTItem),
        artistAlbums: artist.albums
      });
    } else {
      const listData = data as (YTPlaylistItem | YTChannelItem | YTAlbumItem);
      const isChannel = data.type === 'channel';

      setListStore({
        name: listData.name,
        img: listData.img,
        id: id,
        author: 'author' in listData ? (listData as YTPlaylistItem | YTAlbumItem).author || '' : listData.name,
        type: isChannel ? 'channels' : 'playlists',
        url: id,
        list: (listData.items || []).map(v => ({
          ...v,
          author: (data.type === 'album' && !v.author.endsWith(' - Topic')) ? `${v.author} - Topic` : v.author
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
  setListStore(initialState());
}
