import { JSX, lazy } from "solid-js";
import { createStore } from "solid-js/store";
const Home = lazy(() => import('../../features/Home'));
const List = lazy(() => import('../../features/List'));
const Queue = lazy(() => import('../../features/Queue'));
const Player = lazy(() => import('../../features/Player'));
const Settings = lazy(() => import('../../features/Settings'));
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
  home: { ref: null, state: false, component: Home },
  list: { ref: null, state: false, component: List },
  settings: { ref: null, state: false, component: Settings },
  updater: { ref: null, state: false, component: Updater }
});



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

  if (removedIndex >= 3)
    closestRef?.scrollIntoView();


  setNavStore(name, { ref: null, state: false });
}

type Params = 'q' | 's' | 'f' | 'v' | 'collection' | 'playlist' | 'channel' | 'si' | 'supermix' | 't';

export function updateParam(
  param: Params,
  value?: string
) {
  if (value)
    params.set(param, value);
  else
    params.delete(param);

  const str = params.toString();

  history.replaceState({}, '', location.origin + location.pathname + (str && '?') + params.toString());
}


