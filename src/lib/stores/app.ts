import { createStore } from "solid-js/store";
import { params } from "./navigation";
import { config } from "../utils/config";

type Services = 'piped' | 'invidious' | 'hyperpipe'
const storeInit: {
  api: Record<Services, string[]> & {
    jiosaavn: string,
    index: Record<Services, number>
  }
  lrcSync: (arg0: number) => {} | void,
  stream: CollectionItem,
  streamHistory: string[]
  linkHost: string,
  searchQuery: string,
  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg'
} = {
  api: {
    piped: ['https://piapi.ggtyler.dev'],
    invidious: ['https://iv.ggtyler.dev'],
    hyperpipe: ['https://hpapi.ggtyler.dev'],
    jiosaavn: 'https://saavn.dev',
    index: {
      piped: 0,
      invidious: 0,
      hyperpipe: 0
    }
  },
  lrcSync: () => { },
  stream: {
    id: params.get('s') || '',
    title: '',
    author: '',
    duration: '',
    channelUrl: ''
  },
  streamHistory: [],
  linkHost: config.linkHost || location.origin,
  searchQuery: '',
  downloadFormat: config.dlFormat
};

export const [store, setStore] = createStore(storeInit);

export async function initNetwork() {

  const data = await fetch('https://raw.githubusercontent.com/n-ce/Uma/main/dynamic_instances.json')
    .then(res => res.json());

  setStore('api', {
    piped: data.piped,
    invidious: data.invidious,
    hyperpipe: data.hyperpipe,
    jiosaavn: data.jiosaavn,
    index: { piped: 0, invidious: 0, hyperpipe: 0 }
  })

  return data.health as number;

}

