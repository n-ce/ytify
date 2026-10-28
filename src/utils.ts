export function parseDuration(d: string): number {
  const parts = d.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0] * 60;
  return 0;
}

export function convertSStoHHMMSS(seconds: number): string {
  if (seconds < 0) return "";
  if (seconds === Infinity) return "Emergency Mode";
  const hh = Math.floor(seconds / 3600);
  seconds %= 3600;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  let mmStr = String(mm);
  let ssStr = String(ss);
  if (mm < 10) mmStr = "0" + mmStr;
  if (ss < 10) ssStr = "0" + ssStr;
  return (hh > 0 ? hh + ":" : "") + `${mmStr}:${ssStr}`;
}

export const idFromURL = (link: string | null): string | undefined =>
  link?.match(
    /(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i,
  )?.[7];

const pathModifier = (url: string): string =>
  url.includes("=")
    ? "playlists=" + url.split("=")[1]
    : url.slice(1).split("/").join("=");

export const hostResolver = (
  url: string,
  host = typeof location !== "undefined" ? location.origin : "",
): string => {
  const currentOrigin =
    typeof location !== "undefined" ? location.origin : host;
  const isInternal = currentOrigin ? host.includes(currentOrigin) : true;

  return (
    host +
    (isInternal
      ? url.startsWith("/watch")
        ? "?s" + url.slice(8)
        : "?" + pathModifier(url)
      : url)
  );
};

export function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length;

  while (currentIndex !== 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

export function reorderItem<T>(
  list: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Picks the first candidate that is safe to hand to the artwork pipeline. */
export function pickImage(
  ...candidates: Array<string | null | undefined>
): string {
  return (
    candidates.find(
      (candidate): candidate is string =>
        Boolean(candidate) && !candidate!.includes("maxresdefault"),
    ) || ""
  );
}

export function generateImageUrl(id: string, res: string, music?: boolean) {
  if (!id || id.includes("maxresdefault")) return "";
  const proxy = "https://wsrv.nl?url=https://";
  let suffix = "";
  let prefix = "";
  const cleanId =
    id.startsWith("/") && /^\/[a-zA-Z0-9_-]{11}$/.test(id) ? id.slice(1) : id;
  if (cleanId.startsWith("/")) {
    if (music) {
      prefix = `yt3.googleusercontent.com${cleanId}=s720`;
      const s = res === "mq" ? "180" : res || "360";
      suffix = `&output=webp&w=${s}&h=${s}&fit=cover`;
    } else {
      prefix = `yt3.googleusercontent.com${cleanId}=s720-c-k-c0x00ffffff-no-rj`;
      suffix = `&output=webp&w=${res === "mq" ? "180" : res || "360"}`;
    }
  } else {
    prefix = `i.ytimg.com/vi_webp/${cleanId}/${res}default.webp`;
    if (music) {
      const s = res === "mq" ? "180" : "720";
      suffix = `&w=${s}&h=${s}&fit=cover`;
    }
  }
  return proxy + prefix + suffix;
}

export type SortBy = "modified" | "name" | "artist" | "duration";

export function sortCollection(
  list: TrackItem[],
  sortBy: SortBy,
  sortOrder: "asc" | "desc",
): TrackItem[] {
  const listToSort = [...list];

  if (sortBy === "modified") {
    return sortOrder === "asc" ? listToSort.reverse() : listToSort;
  }

  listToSort.sort((a, b) => {
    let result = 0;
    switch (sortBy) {
      case "name":
        result = a.title.localeCompare(b.title);
        break;
      case "artist":
        result = (a.author || "").localeCompare(b.author || "");
        break;
      case "duration":
        result = parseDuration(a.duration) - parseDuration(b.duration);
        break;
    }
    return sortOrder === "asc" ? result : -result;
  });

  return listToSort;
}

/* localStorage helpers - safe, guarded boundary for persisted state */

export function hasLS(): boolean {
  return typeof localStorage !== "undefined";
}

export function lsGet(key: string): string | null {
  if (!hasLS()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function lsGetJSON<T>(key: string, fallback: T): T {
  if (!hasLS()) return fallback;
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function lsSet(key: string, value: string): void {
  if (!hasLS()) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota/security errors */
  }
}

export function lsSetJSON(key: string, value: unknown): void {
  lsSet(key, JSON.stringify(value));
}

export function lsRemove(key: string): void {
  if (!hasLS()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Every localStorage key that starts with `prefix`, in storage order. */
export function lsKeys(prefix = ""): string[] {
  if (!hasLS()) return [];
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

/* Array helpers */

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/* Text helpers */

/** Case/diacritic-insensitive form used for local search and grouping. */
export function normalizeText(value?: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** True for both "Artist - Topic" and the compact "Artist- Topic" variant. */
export function isTopicAuthor(author?: string): boolean {
  return /-\s*Topic$/i.test(author || "");
}

/** Strips a trailing "- Topic" suffix. Non-topic authors pass through trimmed. */
export function stripTopic(author?: string): string {
  return (author || "").replace(/\s*-\s*Topic$/i, "").trim();
}

/** Normalizes an author name to exactly one " - Topic" suffix. */
export function withTopicSuffix(author?: string): string {
  const name = (author || "").trim();
  if (!name) return "";
  return isTopicAuthor(name)
    ? name.replace(/\s*-\s*Topic$/i, " - Topic")
    : `${name} - Topic`;
}

/** Stable grouping key for an author, ignoring topic suffix, diacritics and case. */
export function normalizeAuthorKey(author?: string): string {
  return normalizeText(stripTopic(author));
}

/* Misc */

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
