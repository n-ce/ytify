import { JSX, lazy } from "solid-js";
import { createStore } from "solid-js/store";
import { config, hex2binary } from "../utils";

const Home = lazy(() => import('../../features/Home'));
const List = lazy(() => import('../../features/List'));
const Queue = lazy(() => import('../../features/Queue'));
const Player = lazy(() => import('../../features/Player'));
const Search = lazy(() => import('../../features/Search'));
const Settings = lazy(() => import('../../features/Settings'));
const Video = lazy(() => import('../../features/Video'));
const Lyrics = lazy(() => import('../../features/Lyrics'));

export const params = (new URL(location.href)).searchParams;

const initialFeatures: {
  [key in Features]: {
    ref: HTMLElement | null,
    state: boolean,
    component: () => JSX.Element
  } } = {
  queue: { ref: null, state: false, component: Queue },
  player: { ref: null, state: false, component: Player },
  lyrics: { ref: null, state: false, component: Lyrics },
  home: { ref: null, state: true, component: Home },
  search: { ref: null, state: false, component: Search },
  list: { ref: null, state: false, component: List },
  video: { ref: null, state: false, component: Video },
  settings: { ref: null, state: false, component: Settings },
};

export const [navStore, setNavStore] = createStore({
  features: initialFeatures,
  params: {
    p: params.get('p') ? hex2binary(params.get('p')!) : '00010000', // page binary
    q: params.get('q') || '', // search query 
    f: params.get('f') || config.searchFilter || 'all', // search filter 
    s: params.get('s') || '', // stream id 
    collection: params.get('collection') || '', // collection name 
    channel: params.get('channel') || '', // yt channel id 
    playlists: params.get('playlists') || '', // yt playlist id 
    si: params.get('si') || '' // shared collection id 
  },
  history: [] as string[]
});

function updatePage() {

  const { features } = navStore;
  let binary = '';
  for (const f in features)
    binary += features[f as Features].state ? '1' : '0';
  setNavStore('params', 'p', binary);
}

export function openFeature(name: Features, ref: HTMLElement) {
  ref.scrollIntoView({ behavior: 'smooth' });
  setNavStore('features', name, { ref, state: true });
  updatePage();
}


export function closeFeature(name: Features) {
  const { features } = navStore;
  const keys = Object.keys(features);
  const removedIndex = keys.indexOf(name);

  const active = Object.entries(features)
    .filter(f => f[1].state && f[0] !== name)
    .sort((a, b) => {
      const aa = Math.abs(keys.indexOf(a[0]) - removedIndex);
      const bb = Math.abs(keys.indexOf(b[0]) - removedIndex);
      return aa - bb;
    });

  const closestRef = active[0]?.[1]?.ref;
  if (removedIndex < 3)
    closestRef?.parentElement?.scrollTo({
      left: closestRef?.offsetWidth,
      behavior: 'smooth'
    });
  else
    closestRef?.scrollIntoView({ behavior: 'smooth' });

  setTimeout(() => {
    setNavStore('features', name, { state: false, ref: null });
    updatePage();
  }, 500);
}
