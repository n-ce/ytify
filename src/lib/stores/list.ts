import { createStore } from "solid-js/store";


export const [listStore, setListStore] = createStore({
  isLoading: false,
  list: {} as Collection,
  reservedCollections: ['discover', 'history', 'favorites', 'listenLater', 'channels', 'playlists'],
  addToCollectionOptions: [] as string[],
  isReversed: false,
  name: '',
  url: '',
  type: '',
  id: '',
  uploader: '',
  thumbnail: ''
});
