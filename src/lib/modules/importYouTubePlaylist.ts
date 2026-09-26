import { getLists, saveLists } from "@utils";
import { store, setStore, t } from "@stores";

/** Playlist ids are URL-safe tokens: no dots, slashes or spaces. */
const RAW_ID = /^[a-zA-Z0-9_-]{2,}$/;

/** Prefixes YouTube uses for the playlist ids it hands out. */
const ID_PREFIX = /^(PL|OLAK|RD|VL|LL)/;

const isUrl = (value: string) => /^https?:\/\//i.test(value);

/**
 * Resolves a playlist id from a raw id, a `list=` query param (watch links and
 * /playlist links) or a YT Music `/browse/VL<id>` path.
 */
export function extractPlaylistId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  // Scheme-less links such as "music.youtube.com/playlist?list=…" still parse.
  if (!isUrl(value) && /^(?:[\w-]+\.)+[a-z]{2,}\//i.test(value))
    return extractPlaylistId(`https://${value}`);

  if (!isUrl(value)) {
    if (ID_PREFIX.test(value)) return value.replace(/^VL/, "");
    return RAW_ID.test(value) ? value : null;
  }

  try {
    const url = new URL(value);
    const list = url.searchParams.get("list");
    if (list) return list;

    const browse = url.pathname.match(/\/browse\/(?:VL)?([a-zA-Z0-9_-]+)/);
    if (browse) return browse[1];
  } catch {
    return null;
  }

  return null;
}

/** Best effort clipboard prefill, so a copied link only needs confirming. */
async function readClipboardPlaylist(): Promise<string> {
  try {
    const clip = (await navigator.clipboard?.readText())?.trim();
    const looksLikePlaylist = clip?.includes("list=") || ID_PREFIX.test(clip);
    if (clip && looksLikePlaylist && extractPlaylistId(clip)) return clip;
  } catch {
    // Clipboard is optional: it needs permission and is not universally granted.
  }
  return "";
}

/** Fetches playlist metadata, or null when YouTube has nothing for that id. */
async function fetchPlaylist(id: string): Promise<Playlist | null> {
  try {
    const res = await fetch(`${store.api}/playlist?id=${id}`);
    if (!res.ok) return null;

    const data = (await res.json()) as YTPlaylistItem;
    if (!data || (data.name === "Unknown Playlist" && !data.items?.length))
      return null;

    // maxresdefault 404s for most videos, so it is never a usable thumbnail.
    const apiImg =
      data.img && !data.img.includes("maxresdefault") ? data.img : "";

    return {
      id,
      name: data.name || "YouTube Playlist",
      author: data.author || "YouTube Music",
      img: apiImg || data.items?.[0]?.id || "",
    };
  } catch (e) {
    console.error("Failed to import YouTube playlist:", e);
    return null;
  }
}

export default async function importYouTubePlaylist() {
  const input = prompt(
    t("library_import_yt_playlist_prompt"),
    await readClipboardPlaylist(),
  );
  if (!input) return;

  const ids = [
    ...new Set(
      input
        .split(/[\n,]+/)
        .map(extractPlaylistId)
        .filter((id): id is string => !!id),
    ),
  ];

  if (!ids.length) {
    setStore("snackbar", t("library_import_yt_playlist_invalid"));
    return;
  }

  const saved = getLists("playlists");
  const known = new Set(saved.map((playlist) => playlist.id));
  const pending = ids.filter((id) => !known.has(id));

  if (!pending.length) {
    setStore("snackbar", t("list_already_exists"));
    return;
  }

  setStore("snackbar", t("loading"));

  const imported = (
    await Promise.all(pending.map(fetchPlaylist))
  ).filter(Boolean) as Playlist[];

  if (!imported.length) {
    setStore("snackbar", t("fetchlist_error"));
    return;
  }

  saveLists("playlists", [...saved, ...imported]);
  setStore("libraryUpdated", (c) => c + 1);
  setStore(
    "snackbar",
    t(
      "library_import_yt_playlist_success",
      imported.map((playlist) => playlist.name).join(", "),
    ),
  );
}
