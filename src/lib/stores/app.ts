import { createStore } from "solid-js/store";

const storeInit: {
  invidious: string[],
  index: number
  useSaavn: boolean,
  api: string,
  updater?: () => void,
  actionsMenu?: CollectionItem & { albumId?: string },
  snackbar?: string,
  syncState?: SyncState,
} = {
  invidious: [],
  index: 0,
  api: Backend[Math.floor(Math.random() * Backend.length)],
  useSaavn: true,
};

export const [store, setStore] = createStore(storeInit);
