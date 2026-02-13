import { YTNodes } from 'youtubei.js';
import { getClient, getThumbnail, formatDuration, getThumbnailId } from './utils';

export default async function(id: string) {
  const yt = await getClient();
  const album = await yt.music.getAlbum(id);

  let name = '';
  let author = '';
  let thumbnails: { url: string; width: number; height: number }[] = [];
  let year = '';

  const header = album.header;
  if (header?.is(YTNodes.MusicDetailHeader)) {
    const detailHeader = header.as(YTNodes.MusicDetailHeader);
    name = detailHeader.title.text || '';
    author = detailHeader.author?.name || '';
    thumbnails = detailHeader.thumbnails;
    year = detailHeader.year || '';
  } else if (header?.is(YTNodes.MusicResponsiveHeader)) {
    const responsiveHeader = header.as(YTNodes.MusicResponsiveHeader);
    name = responsiveHeader.title.text || '';
  }

  const items = (album.contents || []).map((item) => {
    if (item.is(YTNodes.MusicResponsiveListItem)) {
      const musicItem = item.as(YTNodes.MusicResponsiveListItem);
      return {
        id: musicItem.id || '',
        title: musicItem.title || '',
        author: musicItem.author?.name || author || '',
        authorId: musicItem.author?.channel_id || '',
        duration: formatDuration(musicItem.duration?.text),
        albumId: id,
        type: 'video' as const,
        subtext: name
      };
    }
    return null;
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    id: id,
    name,
    author,
    year,
    img: '/' + getThumbnailId(getThumbnail(thumbnails)),
    items,
    type: 'album' as const
  };
}
