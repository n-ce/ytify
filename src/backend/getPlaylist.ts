import { YTNodes, type Helpers } from "youtubei.js";
import {
  getClient,
  getThumbnail,
  formatDuration,
  formatThumbnailId,
  getVideoId,
  getLockupMeta,
  formatTopicAuthor,
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

  // 1. Attempt YouTube Music playlist fetch first (natively returns ATVs/songs for music content)
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
  } catch {
    // If music playlist fails (e.g. video-only or unmapped category), fallback below
  }

  // 2. Fallback to regular YouTube playlist fetch if music playlist returned no items
  if (!playlist || !items || items.length === 0) {
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
        // LockupView can have content_type "SHOW" or "COURSE" in addition to "VIDEO"
        if (
          lockup.content_id &&
          (lockup.content_type === "VIDEO" ||
            lockup.content_type === "SHOW" ||
            (lockup.content_type as string) === "COURSE")
        ) {
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
          const rawAuthor =
            Array.isArray(rawArtists) && rawArtists.length > 0
              ? rawArtists
                  .map((a: any) => a.name)
                  .filter(Boolean)
                  .join(", ")
              : (song as any).author?.name ||
                (author && author !== "Unknown" ? author : "YouTube Music");
          const itemType = (
            (song as any).item_type === "video" ? "video" : "song"
          ) as "video" | "song";
          const itemAuthor =
            itemType === "song" ? formatTopicAuthor(rawAuthor) : rawAuthor;
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
            type: itemType,
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

  // 3. Ensure all items of type "song" have an author with the " - Topic" suffix
  for (const item of allItems) {
    if (item.type === "song") {
      item.author = formatTopicAuthor(item.author);
    }
  }

  return {
    id: playlist?.id || id,
    name,
    author,
    img,
    type: "playlist",
    items: allItems,
  };
}
