import { JSX, lazy } from "solid-js";
import { createStore } from "solid-js/store";
const Home = lazy(() => import('../../features/Home'));
const List = lazy(() => import('../../features/List'));
const Queue = lazy(() => import('../../features/Queue'));
const Player = lazy(() => import('../../features/Player'));
const Search = lazy(() => import('../../features/Search'));
const Settings = lazy(() => import('../../features/Settings'));
const Video = lazy(() => import('../../features/Video'));
const Lyrics = lazy(() => import('../../features/Lyrics'));
const Updater = lazy(() => import('../../features/Updater'));

export const params = (new URL(location.href)).searchParams;


type Nav = { [key in Features]: {
  ref: HTMLElement | null,
  state: boolean,
  component: () => JSX.Element
} }

export const [navStore, setNavStore] = createStore<Nav>({
  queue: { ref: null, state: false, component: Queue },
  player: { ref: null, state: false, component: Player },
  lyrics: { ref: null, state: false, component: Lyrics },
  home: { ref: null, state: true, component: Home },
  search: { ref: null, state: false, component: Search },
  list: { ref: null, state: false, component: List },
  video: { ref: null, state: false, component: Video },
  settings: { ref: null, state: false, component: Settings },
  updater: { ref: null, state: false, component: Updater }
});


export function openFeature(name: Features, ref: HTMLElement) {
  ref.scrollIntoView({ behavior: 'smooth' });
  setNavStore(name, { ref, state: true });
}


export function closeFeature(name: Features) {
  const keys = Object.keys(navStore);
  const removedIndex = keys.indexOf(name);

  const active = Object.entries(navStore)
    .filter(f => f[1].state && f[0] !== name)
    .sort((a, b) => {
      const aa = Math.abs(keys.indexOf(a[0]) - removedIndex);
      const bb = Math.abs(keys.indexOf(b[0]) - removedIndex);
      return aa - bb;
    });

  const closestRef = active[0]?.[1]?.ref;

  console.log(closestRef?.checkVisibility())
  if (removedIndex < 3)
    closestRef?.parentElement?.scrollTo({
      left: closestRef?.offsetWidth,
      behavior: 'smooth'
    });
  else
    closestRef?.scrollIntoView({ behavior: 'smooth' });

  setTimeout(() => {
    setNavStore(name, { ref: null, state: false });
  }, 300);

}

type Params = 'q' | 's' | 'f' | 'v' | 'collection' | 'playlist' | 'channel' | 'si' | 'supermix';

export function updateParam(
  param: Params,
  value: string | undefined = undefined
) {
  if (value)
    params.set(param, value);
  else
    params.delete(param);

  const str = params.toString();

  history.replaceState({}, '', location.origin + (str && '?') + params.toString());
}


addEventListener('popstate', () => {

})
