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

export function generateArtworkUrl(id: string, music?: boolean) {
  return generateImageUrl(id, "maxres", music);
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
