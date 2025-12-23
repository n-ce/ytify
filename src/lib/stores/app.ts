import { createStore } from "solid-js/store";
import { config } from "@lib/utils/config";

const storeInit: {
  invidious: string[],
  index: number
  useSaavn: boolean,
  api: string,
  updater?: () => void,
  actionsMenu?: CollectionItem,
  snackbar?: string,
  syncState?: SyncState,
  homeView: '' | 'Hub' | 'Library' | 'Search',
} = {
  invidious: [],
  index: 0,
  api: Backend[Math.floor(Math.random() * Backend.length)],
  useSaavn: true,
  homeView: config.home as "" | "Hub" | "Library" | "Search",
};

export const [store, setStore] = createStore(storeInit);
