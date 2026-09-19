import { YTNodes, type Helpers } from "youtubei.js";
import {
  getClient,
  getThumbnail,
  formatDuration,
  formatThumbnailId,
  getVideoId,
  getLockupMeta,
} from "./utils.js";

export default async function (
  id: string,
  all?: boolean,
): Promise<YTPlaylistItem> {
  const yt = await getClient();
  let playlist: any = null;
  let items: any[] = [];
  let name = "Unknown Playlist";
  let author = "";
  let img = "";

  const isMusic = id.startsWith("RD") || id.startsWith("OLAK");

  if (isMusic) {
    try {
      const musicPlaylist = await yt.music.getPlaylist(id);
      if (musicPlaylist) {
        playlist = musicPlaylist;
        items = musicPlaylist.items || [];
        const header = musicPlaylist.header;
        if (header?.is(YTNodes.MusicDetailHeader)) {
          const detailHeader = header.as(YTNodes.MusicDetailHeader);
          name = detailHeader.title.text || name;
          author = detailHeader.author?.name || author || "YouTube Music";
          img = formatThumbnailId(getThumbnail(detailHeader.thumbnails || []));
        } else if (header?.is(YTNodes.MusicResponsiveHeader)) {
          const responsiveHeader = header.as(YTNodes.MusicResponsiveHeader);
          name = responsiveHeader.title.text || name;
          const foundAuthor = (responsiveHeader as any).subtitle?.runs?.find(
            (r: any) =>
              r.text &&
              !/^\d+/.test(r.text) &&
              r.text !== "Playlist" &&
              r.text.trim() !== "•",
          )?.text;
          author =
            foundAuthor?.trim() ||
            (responsiveHeader as any).strapline_text_one?.text ||
            author ||
            "YouTube Music";
          const thumbContents =
            (responsiveHeader as any).thumbnail?.contents || [];
          img = formatThumbnailId(getThumbnail(thumbContents));
        }
      }
    } catch (e) {
      console.error("Error fetching music playlist:", e);
    }
  }

  if (isMusic && (!author || author === "Unknown")) {
    author = "YouTube Music";
  }

  if (!playlist) {
    try {
      playlist = await yt.getPlaylist(id);
      items = playlist.videos || [];
      name = playlist.info?.title || name;
      author = playlist.info?.author?.name || author;
      img = formatThumbnailId(getThumbnail(playlist.info?.thumbnails || []));
    } catch (e) {
      console.error("Error fetching regular playlist:", e);
    }
  }

  if (
    !playlist ||
    (name === "Unknown Playlist" && (!items || items.length === 0))
  ) {
    try {
      const musicPlaylist = await yt.music.getPlaylist(id);
      if (musicPlaylist) {
        playlist = musicPlaylist;
        items = musicPlaylist.items || [];
        const header = musicPlaylist.header;
        if (header?.is(YTNodes.MusicDetailHeader)) {
          const detailHeader = header.as(YTNodes.MusicDetailHeader);
          if (name === "Unknown Playlist")
            name = detailHeader.title.text || name;
          if (!author || author === "Unknown" || author === " • ")
            author = detailHeader.author?.name || author || "YouTube Music";
          if (!img)
            img = formatThumbnailId(
              getThumbnail(detailHeader.thumbnails || []),
            );
        } else if (header?.is(YTNodes.MusicResponsiveHeader)) {
          const responsiveHeader = header.as(YTNodes.MusicResponsiveHeader);
          if (name === "Unknown Playlist")
            name = responsiveHeader.title.text || name;
          if (!author || author === "Unknown" || author === " • ") {
            const foundAuthor = (responsiveHeader as any).subtitle?.runs?.find(
              (r: any) =>
                r.text &&
                !/^\d+/.test(r.text) &&
                r.text !== "Playlist" &&
                r.text.trim() !== "•",
            )?.text;
            author =
              foundAuthor?.trim() ||
              (responsiveHeader as any).strapline_text_one?.text ||
              "YouTube Music";
          }
          if (!img) {
            const thumbContents =
              (responsiveHeader as any).thumbnail?.contents || [];
            img = formatThumbnailId(getThumbnail(thumbContents));
          }
        }
      }
    } catch (e) {
      console.error("Error in music playlist fallback:", e);
    }
  }

  const allItems: YTItem[] = [];

  const mapItems = (nodes: Helpers.YTNode[]) => {
    nodes.forEach((item) => {
      if (item.is(YTNodes.PlaylistVideo)) {
        const v = item.as(YTNodes.PlaylistVideo);
        const subtext = v.video_info?.toString() || "";
        allItems.push({
          id: v.id,
          title: v.title.toString(),
          author: v.author.name,
          authorId: v.author.id,
          duration: formatDuration(v.duration.text),
          subtext,
          type: "video" as const,
        });
      } else if (item.is(YTNodes.LockupView)) {
        const lockup = item.as(YTNodes.LockupView);
        if (lockup.content_id && lockup.content_type === "VIDEO") {
          const {
            views,
            published,
            duration,
            author: lockupAuthor,
            authorId: lockupAuthorId,
          } = getLockupMeta(lockup);
          const itemAuthor = lockupAuthor || author || "Unknown";
          const subtext = (views || "") + (published ? " • " + published : "");

          allItems.push({
            id: lockup.content_id,
            title: lockup.metadata?.title?.toString() || "Unknown",
            author: itemAuthor,
            authorId: lockupAuthorId || "",
            duration: formatDuration(duration),
            subtext,
            type: "video" as const,
          });
        }
      } else if (item.is(YTNodes.MusicResponsiveListItem)) {
        const song = item.as(YTNodes.MusicResponsiveListItem);
        const videoId = getVideoId(song);
        if (videoId) {
          const rawArtists = (song as any).artists || (song as any).authors;
          const itemAuthor =
            Array.isArray(rawArtists) && rawArtists.length > 0
              ? rawArtists
                  .map((a: any) => a.name)
                  .filter(Boolean)
                  .join(", ")
              : (song as any).author?.name ||
                (author && author !== "Unknown" ? author : "YouTube Music");
          const itemAuthorId =
            Array.isArray(rawArtists) && rawArtists.length > 0
              ? rawArtists[0]?.channel_id || ""
              : (song as any).author?.channel_id || "";
          allItems.push({
            id: videoId,
            title: song.title?.toString() || "Unknown",
            author: itemAuthor,
            authorId: itemAuthorId,
            duration: formatDuration(song.duration?.text),
            subtext: song.album?.name || name || "",
            type: ((song as any).item_type === "video" ? "video" : "song") as
              "video" | "song",
          });
        }
      }
    });
  };

  mapItems(items || []);

  if (all && playlist?.has_continuation) {
    while (playlist.has_continuation) {
      playlist = await playlist.getContinuation();
      mapItems(playlist.items || playlist.contents || []);
    }
  }

  if (!img && allItems.length > 0 && allItems[0].id) {
    img = allItems[0].id;
  }

  return {
    id: id,
    name,
    author: author || "Unknown",
    img,
    type: "playlist" as const,
    items: allItems,
    hasContinuation: playlist?.has_continuation || false,
  };
}
