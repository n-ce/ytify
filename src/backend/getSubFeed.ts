import { YTNodes } from "youtubei.js";
import {
  getClient,
  formatDuration,
  parsePublished,
  getLockupMeta,
} from "./utils.js";

export default async function (ids: string[]) {
  const yt = await getClient();

  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const channel = await yt.getChannel(id);
        const videos = await channel.getVideos();
        return { name: channel.metadata.title?.toString() || "", id, videos };
      } catch (e) {
        return null;
      }
    }),
  );

  const allVideos: (YTItem & { publishedMs: number })[] = [];

  for (const result of results) {
    if (!result) continue;

    for (const node of result.videos.videos || []) {
      if (node.is(YTNodes.Video)) {
        const video = node.as(YTNodes.Video);
        const views =
          video.short_view_count?.toString() || video.view_count?.toString();
        if ((video.duration?.seconds || 0) > 90 && views) {
          const published = video.published
            ?.toString()
            ?.replace("Streamed ", "");
          allVideos.push({
            id: video.id,
            title: video.title?.toString() || "",
            author: result.name || video.author?.name?.toString() || "",
            authorId: result.id || video.author?.id || "",
            duration: formatDuration(video.duration?.text?.toString()),
            subtext: (views || "") + (published ? " • " + published : ""),
            type: "video",
            publishedMs: video.published?.toString()
              ? parsePublished(video.published.toString())
              : 0,
          });
        }
      } else if (node.is(YTNodes.LockupView)) {
        const lockup = node.as(YTNodes.LockupView);
        if (lockup.content_id) {
          const { views, published, duration, durationSeconds } =
            getLockupMeta(lockup);
          if (durationSeconds > 90 && views) {
            allVideos.push({
              id: lockup.content_id,
              title: lockup.metadata?.title?.toString() || "",
              author: result.name,
              authorId: result.id,
              duration: formatDuration(duration),
              subtext: (views || "") + (published ? " • " + published : ""),
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
