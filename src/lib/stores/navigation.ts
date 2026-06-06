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
export type SidePanel = 'queue' | 'player';
export type Feature = MainFeature | SidePanel;

type Nav = { 
  [key in MainFeature]: {
    ref: HTMLElement | null,
    component: () => JSX.Element
  }
} & {
  [key in SidePanel]: {
    ref: HTMLElement | null,
    state: boolean,
    component: () => JSX.Element
  }
}

import { drawer } from "@utils";

export const [navStore, setNavStore] = createStore<Nav & { active: MainFeature }>({
  active: drawer.lastMainFeature as MainFeature,
  queue: { ref: null, state: false, component: Queue },
  player: { ref: null, state: false, component: Player },
  search: { ref: null, component: Search },
  library: { ref: null, component: Library },
  list: { ref: null, component: List },
  settings: { ref: null, component: Settings },
});



export function closeFeature(name: Feature) {
  if (name === 'queue' || name === 'player') {
    setNavStore(name, 'state', false);
  }
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


