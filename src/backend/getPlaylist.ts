import { YTNodes } from 'youtubei.js';
import { getClient, getThumbnail, formatDuration, getThumbnailId } from './utils.js';

export default async function(id: string) {
  const yt = await getClient();
  const playlist = await yt.getPlaylist(id) as {
    header: YTNodes.PlaylistHeader,
    videos: YTNodes.PlaylistVideo[]
  } & any;
  const header = playlist.header?.as(YTNodes.PlaylistHeader);

  return {
    id: id,
    name: header?.title.toString() || 'Unknown Playlist',
    author: header?.author.name || 'Unknown',
    img: '/' + getThumbnailId(getThumbnail(header?.thumbnails || [])),
    type: 'playlist' as const,
    items: playlist.videos.map((video: any) => {
      if (video.is(YTNodes.PlaylistVideo)) {
        const v = video.as(YTNodes.PlaylistVideo) as any;
        const views = v.short_view_count?.toString();
        const published = v.published?.toString();
        const subtext = (views || '') + (published ? ' • ' + published : '');
        return {
          id: v.id,
          title: v.title.toString(),
          author: v.author.name,
          authorId: v.author.id,
          duration: formatDuration(v.duration.text),
          subtext,
          type: 'video' as const
        };
      }
      return null;
    }).filter((item: any): item is NonNullable<typeof item> => item !== null)
  };
}
