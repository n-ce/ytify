import { createStore } from "solid-js/store";
import { config } from "@lib/utils/config";

type Services = 'piped' | 'invidious';
const storeInit: {
  api: Record<Services, string[]> &
  Record<'jiosaavn' | 'cobalt' | 'fallback', string>
  & {
    status: 'N' | 'I' | 'P'
    index: Record<Services, number>
  },
  useSaavn: boolean,
  linkHost: string,
  searchQuery: string,
  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg',
  updater?: () => void,
  actionsMenu: CollectionItem,
  snackbar: string
} = {
  api: {
    piped: ['https://piapi.ggtyler.dev'],
    invidious: ['https://iv.ggtyler.dev'],
    jiosaavn: 'https://saavn.dev',
    cobalt: 'https://cobalt-api.kwiatekmiki.com',
    index: {
      piped: 0,
      invidious: 0
    },
    fallback: location.origin,
    status: 'N'
  },
  useSaavn: true,
  linkHost: config.linkHost || location.origin,
  searchQuery: '',
  downloadFormat: config.dlFormat,
  actionsMenu: {
    id: '',
    title: '',
    author: '',
    channelUrl: '',
    duration: ''
  },
  snackbar: ''
};

export const [store, setStore] = createStore(storeInit);
