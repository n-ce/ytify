import { Component, lazy } from "solid-js";
import { createStore } from "solid-js/store";
const Search = lazy(() => import("@features/Search"));
const Library = lazy(() => import("@features/Library"));
const List = lazy(() => import("@features/List"));
const Queue = lazy(() => import("@features/Queue"));
const Player = lazy(() => import("@features/Player"));
const Settings = lazy(() => import("@features/Settings"));

export const params = new URL(
  typeof location !== "undefined" ? location.href : "https://ytify.app/",
).searchParams;

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

export function getCleanHref(targetFeature: MainFeature): string {
  if (typeof location === "undefined") return "";
  const url = new URL(location.href);
  url.searchParams.delete("library");
  params.delete("library");

  let query = url.searchParams.toString();
  if (targetFeature === "library") {
    params.set("library", "");
    query = query ? `${query}&library` : "library";
  }
  return url.pathname + (query ? `?${query}` : "") + url.hash;
}

export function openSubView(feature: MainFeature) {
  if (feature === "search") {
    if (typeof history !== "undefined") {
      history.replaceState(
        { ...history.state, panel: null },
        "",
        getCleanHref("search"),
      );
    }
    setNavStore("active", "search");
    return;
  }
  if (navStore.active !== feature) {
    if (typeof history !== "undefined") {
      const href = getCleanHref(feature);
      history.pushState({ panel: feature }, "", href);
    }
    setNavStore("active", feature);
  }
}

export function closeSubView() {
  if (typeof history !== "undefined" && history.state?.panel) {
    history.back();
  } else {
    if (typeof history !== "undefined") {
      history.replaceState(
        { ...history.state, panel: null },
        "",
        getCleanHref("search"),
      );
    }
    setNavStore("active", "search");
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", (e) => {
    if (e.state?.panel) {
      if (e.state.panel === "library") {
        params.set("library", "");
      } else {
        params.delete("library");
      }
      setNavStore("active", e.state.panel);
    } else {
      params.delete("library");
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
      params.delete("library");
    }
    if (param === "q" || param === "f") {
      listParams.forEach((p) => params.delete(p));
      params.delete("library");
    }
    params.set(param, value);
  } else params.delete(param);

  params.delete("library");
  let str = params.toString();
  if (navStore.active === "library") {
    params.set("library", "");
    str = str ? `${str}&library` : "library";
  }

  if (typeof history !== "undefined" && typeof location !== "undefined") {
    history.replaceState(
      history.state || {},
      "",
      location.origin + location.pathname + (str && "?") + str,
    );
  }
}
