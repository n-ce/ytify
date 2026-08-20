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

  // YouTube migrated channel videos to the modern LockupView layout.
  const mapLockupView = (lockup: any): any => {
    if (!lockup?.content_id) return null;

    const rows = (lockup.metadata?.metadata as any)?.metadata_rows || [];
    const rowParts = (row: any) =>
      (row?.metadata_parts || []).map((p: any) => p.text?.toString()).filter(Boolean);

    const firstRow = rowParts(rows[0]);
    const secondRow = rowParts(rows[1]);
    const views = firstRow[0] || '';
    const published = secondRow[0]?.replace('Streamed ', '') || '';
    const subtext = (views || '') + (published ? ' • ' + published : '');

    let duration = '';
    const contentImage = lockup.content_image as any;
    const overlays = contentImage?.overlays || contentImage?.primary_thumbnail?.overlays || [];
    for (const overlay of overlays) {
      if (overlay.is && overlay.is(YTNodes.ThumbnailBottomOverlayView)) {
        duration = overlay.as(YTNodes.ThumbnailBottomOverlayView).badges?.[0]?.text || '';
        break;
      }
    }

    return {
      id: lockup.content_id,
      title: lockup.metadata?.title?.toString() || '',
      author: name,
      authorId: id,
      duration: formatDuration(duration),
      subtext,
      type: 'video' as const
    };
  };

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
    } else if (item.is && item.is(YTNodes.LockupView)) {
      // Modern layout: LockupView is returned directly.
      return mapLockupView(item);
    } else if (item.type === 'RichItem' && item.content?.type === 'LockupView') {
      // Legacy layout: LockupView nested inside a RichItem.
      return mapLockupView(item.content);
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
