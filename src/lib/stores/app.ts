import { createStore } from "solid-js/store";
import { config } from "@lib/utils/config";

const storeInit: {
  invidious: string[],
  index: number
  useSaavn: boolean,
  api: string,
  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg',
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
  downloadFormat: config.dlFormat,
  homeView: config.home as "" | "Hub" | "Library" | "Search",
};

export const [store, setStore] = createStore(storeInit);
