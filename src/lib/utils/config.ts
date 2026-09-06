import { createSignal } from "solid-js";

export type PanelRatio = "1:1" | "2:3" | "3:4" | "1:2" | "2:5";

export interface LibrarySections {
  subfeed: boolean;
  gallery: boolean;
  listenLater: boolean;
  history: boolean;
  favorites: boolean;
  liked: boolean;
  frequentlyPlayed: boolean;
  discovery: boolean;
}

export type LibrarySectionKey = keyof LibrarySections;

export const defaultLibrarySections: LibrarySections = {
  subfeed: true,
  gallery: true,
  listenLater: true,
  history: true,
  favorites: true,
  liked: true,
  frequentlyPlayed: true,
  discovery: true,
};

export let config = {
  language: "",
  shareAction: "play" as "play" | "watch" | "download",
  quality: "medium" as "low" | "medium" | "high" | "worst",
  stableVolume: false,
  watchMode: "",
  discover: true,
  history: true,
  searchBarLinkCapture: true,
  searchSuggestions: true,
  saveRecentSearches: true,
  loadImage: true,
  panelRatio: "2:5" as PanelRatio,
  roundness: "0.4rem",
  theme: "auto" as "auto" | "light" | "dark",
  persistentShuffle: false,
  durationFilter: "",
  similarContent: false,
  contextualFill: false,
  authorGrouping: false,
  searchFilter: "all",
  volume: "100",
  dbsync: "",
  sortBy: "modified" as "modified" | "name" | "artist" | "duration",
  sortOrder: "desc" as "asc" | "desc",
  librarySections: { ...defaultLibrarySections },
};

type AppConfig = typeof config;

const savedStore = localStorage.getItem("config");
if (savedStore) {
  try {
    const parsed = JSON.parse(savedStore) as Record<string, unknown>;
    (Object.keys(config) as (keyof AppConfig)[]).forEach((key) => {
      if (parsed[key] !== undefined) {
        if (
          key === "librarySections" &&
          typeof parsed[key] === "object" &&
          parsed[key] !== null
        ) {
          config.librarySections = {
            ...defaultLibrarySections,
            ...(parsed[key] as Partial<LibrarySections>),
          };
        } else {
          (config as Record<keyof AppConfig, unknown>)[key] = parsed[key];
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}

export function setConfig<K extends keyof AppConfig>(
  key: K,
  val: AppConfig[K],
) {
  config[key] = val;
  const str = JSON.stringify(config);
  localStorage.setItem("config", str);
}

export const [librarySections, setLibrarySectionsSignal] =
  createSignal<LibrarySections>({
    ...config.librarySections,
  });

export function setLibrarySection(key: LibrarySectionKey, val: boolean) {
  const updated = {
    ...librarySections(),
    [key]: val,
  };
  setLibrarySectionsSignal(updated);
  setConfig("librarySections", updated);
}

/* Transitory local saves thats not supposed to be transferrable */

export let drawer = {
  recentSearches: [] as string[],
  discovery: [] as (YTItem & { frequency: number })[],
  lastMainFeature: "search" as "search" | "library",
  lastList: null as { id: string; type: string; shared?: boolean } | null,
  libraryPlays: {} as Record<string, number>,
};
const savedDrawer = localStorage.getItem("drawer");
if (savedDrawer) {
  try {
    const parsed = JSON.parse(savedDrawer) as Record<string, unknown>;
    (Object.keys(drawer) as (keyof AppDrawer)[]).forEach((key) => {
      if (parsed[key] !== undefined) {
        if (
          key === "lastMainFeature" &&
          parsed[key] !== "search" &&
          parsed[key] !== "library"
        )
          return;
        (drawer as Record<keyof AppDrawer, unknown>)[key] = parsed[key];
      }
    });
  } catch (e) {
    console.error(e);
  }
}

type AppDrawer = typeof drawer;

export function setDrawer<K extends keyof AppDrawer>(
  key: K,
  val: AppDrawer[K],
) {
  drawer[key] = val;
  const str = JSON.stringify(drawer);
  localStorage.setItem("drawer", str);
}

export function applyPanelRatio(ratio: PanelRatio | string) {
  const [left, right] = (ratio || "2:5").split(":");
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.style.setProperty("--panelRatioLeft", left || "2");
    document.documentElement.style.setProperty(
      "--panelRatioRight",
      right || "5",
    );
  }
}
