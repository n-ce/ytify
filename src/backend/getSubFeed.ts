import { YTNodes } from 'youtubei.js';
import { getClient, formatDuration, parsePublished } from './utils.js';

type SubFeedItem = {
  type: 'videoNode';
  video: any;
  authorName: string;
  authorId: string;
} | {
  type: 'lockup';
  lockup: any;
  durationStr: string;
  views: string;
  publishedText: string;
  authorName: string;
  authorId: string;
};

export default async function(ids: string[]) {
  const yt = await getClient();

  const results = await Promise.all(
    ids.map(id =>
      yt.getChannel(id)
        .then(async channel => {
          let videoTab;
          try {
            videoTab = await channel.getTabByURL('videos');
          } catch (e) {
            videoTab = await channel.getVideos();
          }
          
          let rawItems: any[] = [];
          if (videoTab) {
            if (videoTab.videos && videoTab.videos.length > 0) {
              rawItems = videoTab.videos;
            } else if (videoTab.page?.contents_memo) {
              const richItems = videoTab.page.contents_memo.get('RichItem') || [];
              rawItems = Array.from(richItems);
            }
          }
          
          return { 
            author: channel.metadata.title?.toString() || '', 
            authorId: id,
            videos: rawItems 
          };
        })
        .catch(() => ({ author: '', authorId: id, videos: [] }))
    )
  );

  const allVideos: SubFeedItem[] = results.flatMap(r =>
    r.videos.flatMap((v): SubFeedItem[] => {
      if (v.is && v.is(YTNodes.Video)) {
        const video = v.as(YTNodes.Video);
        if ((video.duration?.seconds || 0) > 90 && (video.short_view_count?.toString() || video.view_count?.toString())) {
          return [{
            video,
            type: 'videoNode',
            authorName: r.author,
            authorId: r.authorId
          }];
        }
      } else if (v.type === 'RichItem' && v.content?.type === 'LockupView') {
        const lockup = v.content;
        const metadataParts = lockup.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts || [];
        const views = metadataParts[0]?.text?.text || '';
        const publishedText = metadataParts[1]?.text?.text?.replace('Streamed ', '') || '';
        
        let durationStr = '';
        const overlays = lockup.content_image?.overlays || [];
        for (const overlay of overlays) {
          if (overlay.type === 'ThumbnailBottomOverlayView') {
            durationStr = overlay.badges?.[0]?.text || '';
            break;
          }
        }
        
        // Approximate duration check > 90 seconds. 
        // durationStr is like "21:18" or "1:02:30" or "0:15"
        let durationSeconds = 0;
        if (durationStr) {
          const parts = durationStr.split(':').map(Number);
          if (parts.length === 2) {
             durationSeconds = parts[0] * 60 + parts[1];
          } else if (parts.length === 3) {
             durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
        }
        
        if (durationSeconds > 90 && views) {
           return [{
              lockup,
              type: 'lockup',
              durationStr,
              views,
              publishedText,
              authorName: r.author,
              authorId: r.authorId
           }];
        }
      }
      return [];
    })
  );

  return allVideos
    .sort((a, b) => {
      let timeA = 0;
      let timeB = 0;
      if (a.type === 'videoNode') {
         timeA = a.video.published?.toString() ? parsePublished(a.video.published.toString()) : 0;
      } else if (a.type === 'lockup') {
         timeA = a.publishedText ? parsePublished(a.publishedText) : 0;
      }
      if (b.type === 'videoNode') {
         timeB = b.video.published?.toString() ? parsePublished(b.video.published.toString()) : 0;
      } else if (b.type === 'lockup') {
         timeB = b.publishedText ? parsePublished(b.publishedText) : 0;
      }
      return timeB - timeA;
    })
    .map((item) => {
      if (item.type === 'videoNode') {
          const video = item.video;
          const views = video.short_view_count?.toString() || video.view_count?.toString();
          const published = video.published?.toString()?.replace('Streamed ', '');
          const subtext = (views || '') + (published ? ' • ' + published : '');
    
          return {
            id: video.id,
            title: video.title?.toString() || '',
            author: item.authorName || video.author.name?.toString() || '',
            authorId: item.authorId || video.author.id || '',
            duration: formatDuration(video.duration?.text?.toString()),
            subtext,
            type: 'video' as const
          };
      } else {
          // lockup
          const lockup = item.lockup;
          const subtext = (item.views || '') + (item.publishedText ? ' • ' + item.publishedText : '');
          return {
            id: lockup.content_id,
            title: lockup.metadata?.title?.text || '',
            author: item.authorName,
            authorId: item.authorId,
            duration: formatDuration(item.durationStr),
            subtext,
            type: 'video' as const
          };
      }
    });
}
