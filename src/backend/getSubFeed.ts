import { YTNodes } from 'youtubei.js';
import { getClient, formatDuration } from './utils.js';

function parsePublished(text: string): number {
  if (!text) return 0;
  const now = Date.now();
  const match = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (!match) return 0;
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000
  };
  return now - (value * multipliers[unit]);
}

export default async function(ids: string[]) {
  const yt = await getClient();

  const results = await Promise.all(
    ids.map(id =>
      yt.getChannel(id)
        .then(channel => channel.getVideos().then(v => ({ author: channel.metadata.title, videos: v.videos })))
        .catch(() => ({ author: '', videos: [] }))
    )
  );

  const allVideos = results.flatMap(r =>
    r.videos
      .filter(v => v.is(YTNodes.Video) && (v.as(YTNodes.Video).duration?.seconds || 0) > 90)
      .map(v => {
        const video = v.as(YTNodes.Video);
        return {
          video,
          authorName: r.author
        };
      })
  );

  return allVideos
    .sort((a, b) => {
      const timeA = a.video.published?.text ? parsePublished(a.video.published.text) : 0;
      const timeB = b.video.published?.text ? parsePublished(b.video.published.text) : 0;
      return timeB - timeA;
    })
    .map(({ video, authorName }) => ({
      id: video.id,
      title: video.title?.toString() || '',
      author: authorName || video.author.name || '',
      authorId: video.author.id,
      duration: formatDuration(video.duration?.text?.toString()),
      views: video.short_view_count?.toString() || '',
      published: video.published?.text || '',
      type: 'video' as const
    }));
}
