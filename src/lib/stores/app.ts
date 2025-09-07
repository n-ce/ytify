import { createStore } from "solid-js/store";
import { config } from "../utils/config";

type Services = 'piped' | 'invidious' | 'hyperpipe'
const storeInit: {
  api: Record<Services, string[]> &
  Record<'jiosaavn' | 'cobalt' | 'fallback', string>
  & {
    status: 'N' | 'I' | 'P'
    index: Record<Services, number>
  },
  useSaavn: boolean,
  lrcSync: (arg0: number) => {} | void,
  linkHost: string,
  searchQuery: string,
  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg',
  updater: () => void,
  actionsMenu: CollectionItem,
  snackbar: string
} = {
  api: {
    piped: ['https://piapi.ggtyler.dev'],
    invidious: ['https://iv.ggtyler.dev'],
    hyperpipe: ['https://hpapi.ggtyler.dev'],
    jiosaavn: 'https://saavn.dev',
    cobalt: 'https://cobalt-api.kwiatekmiki.com',
    index: {
      piped: 0,
      invidious: 0,
      hyperpipe: 0
    },
    fallback: location.origin,
    status: 'N'
  },
  useSaavn: config.jiosaavn,
  lrcSync: () => { },
  linkHost: config.linkHost || location.origin,
  searchQuery: '',
  downloadFormat: config.dlFormat,
  updater: () => { },
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
