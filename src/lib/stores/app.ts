import { createStore } from "solid-js/store";
import { config } from "@lib/utils/config";

const storeInit: {
  invidious: string[],
  index: number
  useSaavn: boolean,
  linkHost: string,
  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg',
  updater?: () => void,
  actionsMenu?: CollectionItem & { albumId?: string },
  snackbar?: string,
  syncState?: SyncState,
} = {
  invidious: [],
  index: 0,
  useSaavn: true,
  linkHost: config.linkHost || location.origin,
  downloadFormat: config.dlFormat,
};

export const [store, setStore] = createStore(storeInit);
