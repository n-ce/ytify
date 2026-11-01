import { YTNodes } from "youtubei.js";
import {
  getClient,
  getLockupMeta,
  formatDuration,
  parsePublished,
} from "./utils.js";

export type SubFeedTarget = string | { id: string; name?: string };

export default async function (channels: SubFeedTarget[]) {
  const yt = await getClient();
  const allVideos: (YTItem & { publishedMs: number })[] = [];

  const targets = channels
    .map((c) =>
      typeof c === "string"
        ? { id: c.trim(), name: "" }
        : { id: c.id.trim(), name: c.name || "" },
    )
    .filter((t) => Boolean(t.id));

  const results = await Promise.all(
    targets.map(async (c) => {
      try {
        let channelId = c.id;
        if (channelId.startsWith("@")) {
          try {
            const resolved = await yt.resolveURL(
              `https://youtube.com/${channelId}`,
            );
            channelId = resolved?.payload?.browseId || channelId;
          } catch (err) {
            console.error(`Error resolving channel handle ${channelId}:`, err);
          }
        }
        const channel = await yt.getChannel(channelId);
        const videos = await channel.getVideos();
        const channelName = c.name || channel.metadata?.title?.toString() || "";
        return {
          id: channelId,
          name: channelName,
          videos: videos?.videos || [],
        };
      } catch (e) {
        console.error(`Error fetching channel ${c.id}:`, e);
        return {
          id: c.id,
          name: c.name,
          videos: [],
        };
      }
    }),
  );

  for (const result of results) {
    for (const node of result.videos) {
      if (node.is(YTNodes.Video)) {
        const video = node.as(YTNodes.Video);
        const views =
          video.short_view_count?.toString() ||
          video.view_count?.toString() ||
          "";
        if ((video.duration?.seconds || 0) > 90) {
          const published =
            video.published?.toString()?.replace("Streamed ", "") || "";
          allVideos.push({
            id: video.id,
            title: video.title?.toString() || "",
            author: result.name || video.author?.name?.toString() || "",
            authorId: result.id || video.author?.id || "",
            duration: formatDuration(video.duration?.text?.toString()),
            subtext:
              views && published
                ? `${views} • ${published}`
                : views || published || "",
            type: "video",
            publishedMs: published ? parsePublished(published) : 0,
          });
        }
      } else if (node.is(YTNodes.LockupView)) {
        const lockup = node.as(YTNodes.LockupView);
        if (lockup.content_id) {
          const { views, published, duration, durationSeconds } =
            getLockupMeta(lockup);
          if ((durationSeconds || 0) > 90) {
            allVideos.push({
              id: lockup.content_id,
              title: lockup.metadata?.title?.toString() || "",
              author: result.name,
              authorId: result.id,
              duration: formatDuration(duration),
              subtext:
                views && published
                  ? `${views} • ${published}`
                  : views || published || "",
              type: "video",
              publishedMs: published ? parsePublished(published) : 0,
            });
          }
        }
      }
    }
  }

  return allVideos
    .sort((a, b) => b.publishedMs - a.publishedMs)
    .map(({ publishedMs, ...item }) => item);
}
