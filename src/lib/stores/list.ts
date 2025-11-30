import { createStore } from "solid-js/store";
import { closeFeature, navStore, setNavStore, updateParam } from "./navigation";
import { setStore, store } from "./app";
import fetchArtist, { ArtistResponse } from "@lib/modules/fetchArtist";
import fetchMix from "@lib/modules/fetchMix";
import fetchPlaylist, { PlaylistResponse } from "@lib/modules/fetchPlaylist";
import fetchChannel from "@lib/modules/fetchChannel";
import { convertSStoHHMMSS, generateImageUrl, getApi, getLibraryAlbums, getLists, getThumbIdFromLink, getTracksMap } from "@lib/utils";
import { setQueueStore, addToQueue } from "./queue";
import fetchAlbum, { AlbumResponse } from "@lib/modules/fetchAlbum";



type ArtistAlbum = {
  id?: string;
  title: string;
  subtitle: string;
  thumbnail: string;
};

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
  artistAlbums: [] as ArtistAlbum[],
  observer: { disconnect() { } } as IntersectionObserver
});

export const [listStore, setListStore] = createStore(initialState());


export async function getList(
  url: string,
  type: 'playlist' | 'channel' | 'album' | 'mix' | 'artist',
  index = store.invidious.length - 1
) {


  if (type === 'mix') {
    setQueueStore('isLoading', true);
    const list = await fetchMix(url, getApi(index));
    setQueueStore('list', []);
    addToQueue(list);
    setQueueStore('isLoading', false);
    return;
  }

  setListStore('isLoading', true);
  if (navStore.list.state)
    navStore.list.ref?.scrollIntoView();
  else
    setNavStore('list', 'state', true);

  if (type === 'playlist') {


    const libraryAlbums = getLibraryAlbums();
    const albumId = url;

    if (
      url.startsWith('OLAK5uy') &&
      albumId in libraryAlbums
    ) {
      const savedAlbum = libraryAlbums[albumId];
      const tracksMap = getTracksMap();
      const albumTracks = savedAlbum.tracks.map(trackId => {
        const track = tracksMap[trackId];
        if (track) {
          track.albumId = albumId;
        }
        return track;
      }).filter(Boolean);

      setListStore({
        thumbnail: generateImageUrl(savedAlbum.thumbnail, '720'),
        id: albumId,
        url: albumId,
        type: 'playlists',
        name: savedAlbum.name,
        uploader: savedAlbum.artist,
        list: albumTracks as CollectionItem[]
      });
    } else {
      const data = await fetchPlaylist(url, getApi(index), listStore.page)

        .catch(e => {
          if (index === 0) {
            setStore('snackbar', e.message);
            index = store.invidious.length;
            resetList();
            return {} as PlaylistResponse;
          }
          else getList(url, type, index - 1);

        });
      if (!data) return;
      const { author, title, thumbnail, videos } = data;

      const savedThumbId = getLists('playlists').find(p => p.id === url);
      const savedThumb = savedThumbId ? generateImageUrl(savedThumbId?.thumbnail, '720') : '';

      setListStore({
        name: savedThumbId?.name || title,
        thumbnail: savedThumb || thumbnail || listStore.thumbnail || generateImageUrl(videos[0].videoId, 'maxres'),
        id: url,
        uploader: author,
        type: 'playlists',
        url: url,
        list: videos.map(v => ({
          id: v.videoId,
          title: v.title,
          author: (url.startsWith('OLAK5uy')
            && !v.author.endsWith(' - Topic')) ? `${v.author} - Topic` : v.author,
          authorId: v.authorId,
          duration: convertSStoHHMMSS(v.lengthSeconds)
        }) as CollectionItem)
      });
    }
  }

  if (type === 'channel') {

    const data = await fetchChannel(url, getApi(index), listStore.page)
      .catch(e => {
        if (index === 0) {
          setStore('snackbar', e.message);
          index = store.invidious.length;
          resetList();
          return { author: '', thumbnail: '', videos: [] };
        }
        else getList(url, type, index - 1);
      });
    if (!data) return;

    const { author, thumbnail, videos } = data;
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
    const artistData = await fetchArtist(url)
      .catch(e => {
        if (index === 0) {
          setStore('snackbar', e.message);
          index = store.invidious.length;
          resetList();
          return {} as ArtistResponse;
        }
        else getList(url, type, index - 1);
      });
    if (!artistData) return;
    const { playlistId, artistName, albums } = artistData;

    const playlistData = await fetchPlaylist(playlistId, getApi(index), listStore.page)
      .catch(e => {
        if (index === 0) {
          setStore('snackbar', e.message);
          index = store.invidious.length;
          resetList();
          return {} as PlaylistResponse;
        }
        else getList(url, type, index - 1);
      });

    if (!playlistData) return;

    const { videos } = playlistData;

    setListStore({
      name: 'Artist - ' + artistName,
      id: url,
      type: 'channels',
      url: url,
      list: videos.map(v => ({
        id: v.videoId,
        title: v.title,
        author: v.author.endsWith(' - Topic') ? v.author : `${v.author} - Topic`,
        authorId: v.authorId,
        duration: convertSStoHHMMSS(v.lengthSeconds)
      }) as CollectionItem),
      artistAlbums: albums.filter(album => album.id && album.title && album.thumbnail)
    })
  }

  if (type === 'album') {
    const albumData = await fetchAlbum(url)
      .catch(e => {
        if (index === 0) {
          setStore('snackbar', e.message);
          index = store.invidious.length;
          resetList();
          return {} as AlbumResponse;
        }
        else getList(url, type, index - 1);
      });
    if (!albumData) return;
    const { thumbnail, playlistId } = albumData;

    const playlistData = await fetchPlaylist(playlistId, getApi(index), listStore.page)
      .catch(e => {
        if (index === 0) {
          setStore('snackbar', e.message);
          index = store.invidious.length;
          resetList();
          return {} as PlaylistResponse;
        }
        else getList(url, type, index - 1);
      });
    if (!playlistData) return;
    const { title, videos, subtitle } = playlistData;

    setListStore({
      thumbnail: generateImageUrl(getThumbIdFromLink(thumbnail), '720'),
      id: playlistId,
      url: url,
      type: 'playlists',
      name: title,
      uploader: subtitle.replace(' • Album', ''),
      list: videos.map(v => ({
        id: v.videoId,
        title: v.title,
        author: v.author.endsWith(' - Topic') ? v.author : `${v.author} - Topic`,
        authorId: v.authorId,
        duration: convertSStoHHMMSS(v.lengthSeconds)
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
