import { createStore } from "solid-js/store";
import { params } from "./navigation";
import { config } from "../utils/config";

type Services = 'piped' | 'invidious' | 'hyperpipe'
const storeInit: {
  features: Record<Features, boolean>,
  api: Record<Services, string[]> & {
    jiosaavn: string,
    index: Record<Services, number>
  }
  lrcSync: (arg0: number) => {} | void,
  queuelist: string[],
  stream: CollectionItem,
  streamHistory: string[]
  linkHost: string,
  searchQuery: string,
  addToCollectionOptions: string[],
  list: List & Record<'url' | 'type' | 'uploader', string> & { data: CollectionItem[] },
  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg'
} = {
  features: {
    player: false,
    list: false,
    settings: false,
    search: false,
    lyrics: false,
    video: false
  },
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
  queuelist: [],
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
  list: {
    name: '',
    url: '',
    type: '',
    id: '',
    uploader: '',
    thumbnail: '',
    data: []
  },
  addToCollectionOptions: [],
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

