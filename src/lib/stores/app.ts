import { createStore } from "solid-js/store";

const storeInit: {
  useSaavn: boolean,
  api: string,
  updater?: () => void,
  actionsMenu?: TrackItem & { albumId?: string },
  snackbar?: string,
  syncState?: SyncState,
} = {
  api: Backend[Math.floor(Math.random() * Backend.length)],
  useSaavn: true,
};

export const [store, setStore] = createStore(storeInit);
