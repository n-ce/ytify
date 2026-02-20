import { YTNodes, type Helpers } from 'youtubei.js';
import { getClient, getThumbnail, formatDuration, getThumbnailId } from './utils.js';

export default async function(id: string, all?: boolean): Promise<YTPlaylistItem> {
  const yt = await getClient();
  let playlist = await yt.getPlaylist(id);

  const { info } = playlist;
  const name = info.title || 'Unknown Playlist';
  const author = info.author.name || 'Unknown';
  const img = '/' + getThumbnailId(getThumbnail(info.thumbnails || []));

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
      }
    });
  };

  mapItems(playlist.items);

  if (all) {
    while (playlist.has_continuation) {
      playlist = await playlist.getContinuation();
      mapItems(playlist.items);
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
