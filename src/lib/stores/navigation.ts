import { JSX, lazy } from "solid-js";
import { createStore } from "solid-js/store";
const Search = lazy(() => import('@features/Search'));
const Library = lazy(() => import('@features/Library'));
const List = lazy(() => import('@features/List'));
const Queue = lazy(() => import('@features/Queue'));
const Player = lazy(() => import('@features/Player'));
const Settings = lazy(() => import('@features/Settings'));


export const params = (new URL(location.href)).searchParams;


export type MainFeature = 'search' | 'library' | 'list' | 'settings';
export type Feature = MainFeature | 'queue' | 'player';

type Nav = { [key in Features]: {
  ref: HTMLElement | null,
  state: boolean,
  component: () => JSX.Element
} }

import { drawer } from "@utils";

export const [navStore, setNavStore] = createStore<Nav & { active: MainFeature }>({
  active: drawer.lastMainFeature as MainFeature,
  queue: { ref: null, state: false, component: Queue },
  player: { ref: null, state: false, component: Player },
  search: { ref: null, state: false, component: Search },
  library: { ref: null, state: false, component: Library },
  list: { ref: null, state: false, component: List },
  settings: { ref: null, state: false, component: Settings },
});



export function closeFeature(name: Features) {
  setNavStore(name, { ref: null, state: false });
}

type Params = 'q' | 's' | 'f' | 'collection' | 'playlist' | 'channel' | 'artist' | 'album' | 'si' | 't';

const listParams: Params[] = ['playlist', 'channel', 'artist', 'album', 'collection', 'si'];

export function updateParam(
  param: Params,
  value?: string
) {
  if (value) {
    if (listParams.includes(param)) {
      listParams.forEach(p => params.delete(p));
      params.delete('q');
      params.delete('f');
    }
    if (param === 'q' || param === 'f') {
      listParams.forEach(p => params.delete(p));
    }
    params.set(param, value);
  }
  else
    params.delete(param);

  const str = params.toString();

  history.replaceState({}, '', location.origin + location.pathname + (str && '?') + params.toString());
}


