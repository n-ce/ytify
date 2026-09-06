import { Component, lazy } from "solid-js";
import { createStore } from "solid-js/store";
const Search = lazy(() => import("@features/Search"));
const Library = lazy(() => import("@features/Library"));
const List = lazy(() => import("@features/List"));
const Queue = lazy(() => import("@features/Queue"));
const Player = lazy(() => import("@features/Player"));
const Settings = lazy(() => import("@features/Settings"));

export const params = new URL(location.href).searchParams;

export type MainFeature = "queue" | "search" | "library" | "list" | "settings";
export type SidePanel = "player";
export type Feature = MainFeature | SidePanel;

type Nav = {
  [key in MainFeature]: {
    ref: HTMLElement | null;
    component: Component<any>;
  };
} & {
  [key in SidePanel]: {
    ref: HTMLElement | null;
    state: boolean;
    component: Component<any>;
  };
};

export const [navStore, setNavStore] = createStore<
  Nav & { active: MainFeature }
>({
  active: "search",
  player: { ref: null, state: false, component: Player },
  queue: { ref: null, component: Queue },
  search: { ref: null, component: Search },
  library: { ref: null, component: Library },
  list: { ref: null, component: List },
  settings: { ref: null, component: Settings },
});

export function openSubView(feature: MainFeature) {
  if (feature === "search") {
    if (typeof history !== "undefined" && history.state?.panel) {
      history.replaceState(
        { ...history.state, panel: null },
        "",
        location.href,
      );
    }
    setNavStore("active", "search");
    return;
  }
  if (navStore.active !== feature) {
    history.pushState({ panel: feature }, "", location.href);
    setNavStore("active", feature);
  }
}

export function closeSubView() {
  if (history.state?.panel) {
    history.back();
  } else {
    setNavStore("active", "search");
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", (e) => {
    if (e.state?.panel) {
      setNavStore("active", e.state.panel);
    } else {
      setNavStore("active", "search");
    }
  });
}

export function closeFeature(name: Feature) {
  if (name === "player") {
    setNavStore(name, "state", false);
    navStore[navStore.active]?.ref?.scrollIntoView({ behavior: "smooth" });
  } else {
    closeSubView();
  }
}

type Params =
  | "q"
  | "s"
  | "f"
  | "collection"
  | "playlist"
  | "channel"
  | "artist"
  | "album"
  | "si"
  | "t";

const listParams: Params[] = [
  "playlist",
  "channel",
  "artist",
  "album",
  "collection",
  "si",
];

export function updateParam(param: Params, value?: string) {
  if (value) {
    if (listParams.includes(param)) {
      listParams.forEach((p) => params.delete(p));
      params.delete("q");
      params.delete("f");
    }
    if (param === "q" || param === "f") {
      listParams.forEach((p) => params.delete(p));
    }
    params.set(param, value);
  } else params.delete(param);

  const str = params.toString();

  history.replaceState(
    history.state || {},
    "",
    location.origin + location.pathname + (str && "?") + params.toString(),
  );
}
