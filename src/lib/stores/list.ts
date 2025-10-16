import { createStore } from "solid-js/store";
import { closeFeature, setNavStore, updateParam } from "./navigation";
import { setStore, store } from "./app";
import fetchArtist from "@lib/modules/fetchArtist";
import fetchMix from "@lib/modules/fetchMix";
import fetchPlaylist, { PlaylistResponse } from "@lib/modules/fetchPlaylist";
import fetchChannel from "@lib/modules/fetchChannel";
import { convertSStoHHMMSS, getApi } from "@lib/utils";
import { setQueueStore } from "./queue";
import fetchAlbum from "@lib/modules/fetchAlbum";


const initialState = () => ({
  isLoading: false,
  isSubscribed: false,
  isSortable: false,
  isReversed: false,
isShared: false,
  list: [] as CollectionItem[],
  length: 0,
  reservedCollections: ['history', 'favorites', 'listenLater', 'channels', 'playlists'],
  name: '',
  url: '',
  type: 'collection' as 'channels' | 'playlists' | 'collection',
  id: '',
  page: 1,
  uploader: '',
  thumbnail: '',
  observer: { disconnect() { } } as IntersectionObserver
});

export const [listStore, setListStore] = createStore(initialState());


export async function getList(url: string, type: 'playlist' | 'channel' | 'album' | 'mix' | 'artist') {


  let index = store.invidious.length - 1;

  if (type === 'mix') {
    const list = await fetchMix(url);
    setQueueStore('list', [...list]);
    return;
  }

  setListStore('isLoading', true);
  setNavStore('list', 'state', true);

  if (type === 'playlist') {
    const { author, title, thumbnail, videos } = await fetchPlaylist(url, getApi(index), listStore.page)
      .catch(e => {
        if (index === 0) {
          setStore('snackbar', e.message);
          index = store.invidious.length;
          return {} as PlaylistResponse;
        }
        else {
          return fetchPlaylist(url, getApi(index--), listStore.page);
        }

      });

    setListStore({
      name: title,
      thumbnail: thumbnail,
      id: url,
      uploader: author,
      type: 'playlists',
      url: url,
      list: videos.map(v => ({
        id: v.videoId,
        title: v.title,
        author: v.author,
        authorId: v.authorId,
        duration: convertSStoHHMMSS(v.lengthSeconds)
      }) as CollectionItem)
    });
  }


  if (type === 'channel') {

    const { author, thumbnail, videos } = await fetchChannel(url, getApi(index), listStore.page);
    setListStore({
      name: author,
      thumbnail: thumbnail,
      id: url,
      uploader: author,
      type: 'channels',
      url: url,
      list: videos.map(v => ({
        id: v.videoId,
        title: v.title,
        author: v.author,
        authorId: v.authorId,
        duration: convertSStoHHMMSS(v.lengthSeconds)
      }) as CollectionItem)
    });
  }

  if (type === 'artist') {
    const { playlistId, artistName } = (await fetchArtist(url));
    const { videos, thumbnail } = await fetchPlaylist(playlistId, getApi(index), listStore.page);
    setListStore({
      name: artistName,
      thumbnail: thumbnail,
      id: playlistId,
      uploader: '',
      type: 'playlists',
      url: url,
      list: videos.map(v => ({
        id: v.videoId,
        title: v.title,
        author: v.author,
        authorId: v.authorId,
        duration: convertSStoHHMMSS(v.lengthSeconds)
      }) as CollectionItem)
    })
  }

  if (type === 'album') {
    const { title, thumbnail, tracks } = await fetchAlbum(url);
    setListStore({
      name: title,
      thumbnail: thumbnail,
      id: url,
      uploader: tracks[0].artist,
      type: 'playlists',
      url: url,
      list: tracks.map(v => ({
        id: v.videoId,
        title: v.title,
        author: v.artist,
        authorId: '',
        duration: v.duration
      }) as CollectionItem)
    })
  }

  setListStore('isLoading', false);
}

export function resetList() {
  setNavStore('home', 'state', true);
  closeFeature('list');
  listStore.observer.disconnect();

  updateParam('collection');
  setListStore(initialState());
}
