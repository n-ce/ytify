import { YTNodes } from 'youtubei.js';
import { getClient, getThumbnail, formatDuration, getThumbnailId } from './utils.js';

export default async function(id: string) {
  const yt = await getClient();
  const channel = await yt.getChannel(id);
  const metadata = channel.metadata;
  
  let videoTab;
  try {
    videoTab = await channel.getTabByURL('videos');
  } catch (e) {
    videoTab = await channel.getVideos();
  }

  const name = metadata.title?.toString() || '';
  const img = '/' + getThumbnailId(getThumbnail(metadata.avatar || []));

  let rawItems: any[] = [];
  if (videoTab) {
    if (videoTab.videos && videoTab.videos.length > 0) {
      rawItems = videoTab.videos;
    } else if (videoTab.page?.contents_memo) {
      const richItems = videoTab.page.contents_memo.get('RichItem') || [];
      rawItems = Array.from(richItems);
    }
  }

  const items = rawItems.map((item) => {
    if (item.is && item.is(YTNodes.Video)) {
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
    } else if (item.type === 'RichItem' && item.content?.type === 'LockupView') {
      const lockup = item.content;
      const metadataParts = lockup.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts || [];
      const views = metadataParts[0]?.text?.text || '';
      const published = metadataParts[1]?.text?.text?.replace('Streamed ', '') || '';
      const subtext = (views || '') + (published ? ' • ' + published : '');
      
      let duration = '';
      const overlays = lockup.content_image?.overlays || [];
      for (const overlay of overlays) {
        if (overlay.type === 'ThumbnailBottomOverlayView') {
          duration = overlay.badges?.[0]?.text || '';
          break;
        }
      }
      
      return {
        id: lockup.content_id,
        title: lockup.metadata?.title?.text || '',
        author: name,
        authorId: id,
        duration: formatDuration(duration),
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
