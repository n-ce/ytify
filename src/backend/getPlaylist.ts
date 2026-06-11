import { YTNodes, type Helpers } from 'youtubei.js';
import { getClient, getThumbnail, formatDuration, getThumbnailId, getVideoId } from './utils.js';

export default async function(id: string, all?: boolean): Promise<YTPlaylistItem> {
  const yt = await getClient();
  let playlist: any = await yt.getPlaylist(id);

  let items = playlist.items;
  let name = playlist.info.title || 'Unknown Playlist';
  let author = playlist.info.author.name || 'Unknown';
  let img = '/' + getThumbnailId(getThumbnail(playlist.info.thumbnails || []));

  if (items.length === 0) {
    try {
      const musicPlaylist = await yt.music.getPlaylist(id);
      if (musicPlaylist.contents && musicPlaylist.contents.length > 0) {
        playlist = musicPlaylist;
        items = musicPlaylist.contents;
        const header = musicPlaylist.header;
        if (header?.is(YTNodes.MusicDetailHeader)) {
          const detailHeader = header.as(YTNodes.MusicDetailHeader);
          name = detailHeader.title.text || name;
          author = detailHeader.author?.name || author;
          img = '/' + getThumbnailId(getThumbnail(detailHeader.thumbnails || []));
        } else if (header?.is(YTNodes.MusicResponsiveHeader)) {
          const responsiveHeader = header.as(YTNodes.MusicResponsiveHeader);
          name = responsiveHeader.title.text || name;
          img = '/' + getThumbnailId(getThumbnail((responsiveHeader as any).thumbnail?.contents || []));
        }
      }
    } catch (e) {
      console.error('Error fetching music playlist fallback:', e);
    }
  }

  const allItems: YTItem[] = [];

  const mapItems = (items: Helpers.YTNode[]) => {
    items.forEach((item) => {
      if (item.is(YTNodes.PlaylistVideo)) {
        const v = item.as(YTNodes.PlaylistVideo);
        const subtext = v.video_info?.toString() || '';
        allItems.push({
          id: v.id,
          title: v.title.toString(),
          author: v.author.name,
          authorId: v.author.id,
          duration: formatDuration(v.duration.text),
          subtext,
          type: 'video' as const
        });
      } else if (item.is(YTNodes.MusicResponsiveListItem)) {
        const song = item.as(YTNodes.MusicResponsiveListItem);
        const videoId = getVideoId(song);
        if (videoId) {
          const itemAuthor = song.authors?.[0]?.name || song.author?.name || author || 'Unknown';
          const itemAuthorId = song.authors?.[0]?.channel_id || song.author?.channel_id || '';
          allItems.push({
            id: videoId,
            title: song.title?.toString() || 'Unknown',
            author: itemAuthor,
            authorId: itemAuthorId,
            duration: formatDuration(song.duration?.text),
            subtext: song.album?.name || name || '',
            type: 'song' as const
          });
        }
      }
    });
  };

  mapItems(items);

  if (all) {
    while (playlist.has_continuation) {
      playlist = await playlist.getContinuation();
      mapItems(playlist.items || playlist.contents || []);
    }
  }

  return {
    id: id,
    name,
    author,
    img,
    type: 'playlist' as const,
    items: allItems,
    hasContinuation: playlist.has_continuation
  };
}
