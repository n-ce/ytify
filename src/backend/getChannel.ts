import { YTNodes } from 'youtubei.js';
import { getClient, getThumbnail, formatDuration, getThumbnailId, getLockupMeta } from './utils.js';

export default async function(id: string) {
  const yt = await getClient();
  const channel = await yt.getChannel(id);
  const metadata = channel.metadata;

  const name = metadata.title?.toString() || '';
  const img = '/' + getThumbnailId(getThumbnail(metadata.avatar || []));

  let videos;
  try {
    videos = await channel.getVideos();
  } catch (e) {
    console.error('Error fetching channel videos:', e);
  }

  const items: YTItem[] = [];

  for (const node of videos?.videos || []) {
    if (node.is(YTNodes.Video)) {
      const video = node.as(YTNodes.Video);
      const views = video.short_view_count?.toString() || video.view_count?.toString();
      const published = video.published?.toString()?.replace('Streamed ', '');
      items.push({
        id: video.id,
        title: video.title?.toString() || '',
        author: name,
        authorId: id,
        duration: formatDuration(video.duration?.text?.toString()),
        subtext: (views || '') + (published ? ' • ' + published : ''),
        type: 'video' as const
      });
    } else if (node.is(YTNodes.LockupView)) {
      // YouTube channels now expose their videos as LockupViews.
      const lockup = node.as(YTNodes.LockupView);
      const { views, published, duration } = getLockupMeta(lockup);
      items.push({
        id: lockup.content_id,
        title: lockup.metadata?.title?.toString() || '',
        author: name,
        authorId: id,
        duration: formatDuration(duration),
        subtext: (views || '') + (published ? ' • ' + published : ''),
        type: 'video' as const
      });
    }
  }

  return {
    id: id,
    name,
    img,
    items,
    type: 'channel' as const
  };
}
