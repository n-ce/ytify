import { YTNodes } from 'youtubei.js';
import { getClient, formatDuration, parsePublished } from './utils.js';

export default async function(ids: string[]) {
  const yt = await getClient();

  const results = await Promise.all(
    ids.map(id =>
      yt.getChannel(id)
        .then(channel => channel.getVideos().then(v => ({ 
          author: channel.metadata.title?.toString() || '', 
          authorId: id,
          videos: v.videos 
        })))
        .catch(() => ({ author: '', authorId: id, videos: [] }))
    )
  );

  const allVideos = results.flatMap(r =>
    r.videos
      .filter(v => v.is(YTNodes.Video) && (v.as(YTNodes.Video).duration?.seconds || 0) > 90)
      .map(v => {
        const video = v.as(YTNodes.Video);
        return {
          video,
          authorName: r.author,
          authorId: r.authorId
        };
      })
  );

  return allVideos
    .sort((a, b) => {
      const timeA = a.video.published?.toString() ? parsePublished(a.video.published.toString()) : 0;
      const timeB = b.video.published?.toString() ? parsePublished(b.video.published.toString()) : 0;
      return timeB - timeA;
    })
    .map(({ video, authorName, authorId }) => {
      const views = video.short_view_count?.toString() || video.view_count?.toString();
      const published = video.published?.toString()?.replace('Streamed ', '');
      const subtext = (views || '') + (published ? ' • ' + published : '');

      return {
        id: video.id,
        title: video.title?.toString() || '',
        author: authorName || video.author.name?.toString() || '',
        authorId: authorId || video.author.id || '',
        duration: formatDuration(video.duration?.text?.toString()),
        subtext,
        type: 'video' as const
      };
    });
}
