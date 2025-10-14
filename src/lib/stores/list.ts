import { createStore } from "solid-js/store";
import { closeFeature, setNavStore, updateParam } from "./navigation";


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
  uploader: '',
  thumbnail: '',
  observer: { disconnect() { } } as IntersectionObserver
});

export const [listStore, setListStore] = createStore(initialState());


export async function getList(url: string) {
  console.log(url);
}

export function resetList() {
  setNavStore('home', 'state', true);
  closeFeature('list');
  listStore.observer.disconnect();

  updateParam('collection');
  setListStore(initialState());
}
