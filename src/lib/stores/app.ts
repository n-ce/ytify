import { createStore } from "solid-js/store";
import { config } from "@lib/utils/config";
import { type JSXElement } from "solid-js";

type Services = 'piped' | 'invidious';
const storeInit: {
  api: Record<Services, string[]> &
  { cobalt: string }
  & {
    status: 'N' | 'I' | 'P'
    index: Record<Services, number>
  },
  useSaavn: boolean,
  linkHost: string,
  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg',
  updater?: () => void,
  actionsMenu?: CollectionItem,
  snackbar?: string,
  dialog?: JSXElement
} = {
  api: {
    piped: ['https://piapi.ggtyler.dev'],
    invidious: ['https://iv.ggtyler.dev'],
    cobalt: 'https://cobalt-api.kwiatekmiki.com',
    index: {
      piped: 0,
      invidious: 0
    },
    status: 'N'
  },
  useSaavn: true,
  linkHost: config.linkHost || location.origin,
  downloadFormat: config.dlFormat,
};

export const [store, setStore] = createStore(storeInit);
