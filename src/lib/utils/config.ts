import { createSignal } from "solid-js";

export type PanelRatio = "1:1" | "2:3" | "3:4" | "1:2" | "2:5";

/**
 * auto: plays are cached to OPFS as they are played.
 * on-demand: audio is only cached when the user adds a track to the Cached collection.
 * off: OPFS is unused, the Cached collection is hidden and any cache is cleared.
 */
export type CachingMode = "auto" | "on-demand" | "off";

export const CACHING_MODES: CachingMode[] = ["auto", "on-demand", "off"];

/**
 * Artwork background of the music player.
 * frost / frost-motion: artwork behind a pane that blurs and veils it.
 * blur / blur-motion: artwork behind a pane that only blurs.
 * The -motion variants pan the artwork with the playback progress.
 */
export type PlayerBackground =
  | "none"
  | "frost"
  | "frost-motion"
  | "blur"
  | "blur-motion";

export const PLAYER_BACKGROUNDS: PlayerBackground[] = [
  "none",
  "frost",
  "frost-motion",
  "blur",
  "blur-motion",
];

/** Selectable audio cache ceilings, in megabytes. */
export const CACHE_LIMIT_PRESETS = [250, 500, 1000, 2000];

export const DEFAULT_CACHE_LIMIT_MB = 500;

export interface LibrarySections {
  subfeed: boolean;
  gallery: boolean;
  featured: boolean;
  listenLater: boolean;
  history: boolean;
  favorites: boolean;
  liked: boolean;
  cached: boolean;
  discovery: boolean;
}

export type LibrarySectionKey = keyof LibrarySections;

export const defaultLibrarySections: LibrarySections = {
  subfeed: true,
  gallery: true,
  featured: true,
  listenLater: true,
  history: true,
  favorites: true,
  liked: true,
  cached: true,
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
  playerBackground: "none" as PlayerBackground,
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
  cachingMode: "auto" as CachingMode,
  cacheLimit: DEFAULT_CACHE_LIMIT_MB as number,
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
          const sections = parsed[key] as Record<string, unknown>;
          delete sections.frequentlyPlayed;
          config.librarySections = {
            ...defaultLibrarySections,
            ...(sections as Partial<LibrarySections>),
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

// Guard against hand-edited or stale values before they can drive cache writes.
if (!CACHING_MODES.includes(config.cachingMode))
  config.cachingMode = "auto";
if (!PLAYER_BACKGROUNDS.includes(config.playerBackground))
  config.playerBackground = "none";
if (!(config.cacheLimit > 0)) config.cacheLimit = DEFAULT_CACHE_LIMIT_MB;

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

/* Audio caching */

export const [cachingMode, setCachingModeSignal] =
  createSignal<CachingMode>(config.cachingMode);

export const [cacheLimit, setCacheLimitSignal] = createSignal<number>(
  config.cacheLimit,
);

/* Player artwork background */

export const [playerBackground, setPlayerBackgroundSignal] =
  createSignal<PlayerBackground>(config.playerBackground);

export function setPlayerBackground(background: PlayerBackground) {
  if (!PLAYER_BACKGROUNDS.includes(background)) return;
  setPlayerBackgroundSignal(background);
  setConfig("playerBackground", background);
}

/* Transitory local saves thats not supposed to be transferrable */

export let drawer = {
  recentSearches: [] as string[],
  discovery: [] as (YTItem & { frequency: number })[],
  lastMainFeature: "search" as "search" | "library",
  lastList: null as { id: string; type: string; shared?: boolean } | null,
};
const savedDrawer = localStorage.getItem("drawer");
if (savedDrawer) {
  try {
    const parsed = JSON.parse(savedDrawer) as Record<string, unknown>;
    let hadLegacyPlays = false;
    if ("libraryPlays" in parsed) {
      delete parsed.libraryPlays;
      hadLegacyPlays = true;
    }
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
    if (hadLegacyPlays) {
      localStorage.setItem("drawer", JSON.stringify(drawer));
    }
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
