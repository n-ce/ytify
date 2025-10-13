import { createStore } from "solid-js/store";
import { store } from "./app";
import { closeFeature, updateParam } from "./navigation";


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
  const { api } = store;
  const { piped, index } = api;
  console.log(piped[index], url)

}

export function resetList() {
  closeFeature('list');
  listStore.observer.disconnect();

  updateParam('collection');
  setListStore(initialState());
}
