import { YTNodes } from 'youtubei.js';
import { getClient, getThumbnail, formatDuration, getThumbnailId } from './utils.js';

export default async function(id: string) {
  const yt = await getClient();
  const channel = await yt.getChannel(id);
  const metadata = channel.metadata;
  const videoTab = await channel.getVideos();

  const name = metadata.title?.toString() || '';
  const img = '/' + getThumbnailId(getThumbnail(metadata.avatar || []));

  const items = videoTab.videos.map((item) => {
    if (item.is(YTNodes.Video)) {
      const video = item.as(YTNodes.Video);
      const views = video.short_view_count?.toString() || video.view_count?.toString();
      const published = video.published?.toString()?.replace('Streamed ', '');
      const subtext = (views || '') + (published ? ' • ' + published : '');
      return {
        id: video.id,
        title: video.title?.toString() || '',
        author: name,
        authorId: id,
        duration: formatDuration(video.duration?.text?.toString()),
        subtext,
        type: 'video' as const
      };
    }
    return null;
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    id: id,
    name,
    img,
    items,
    type: 'channel' as const
  };
}
