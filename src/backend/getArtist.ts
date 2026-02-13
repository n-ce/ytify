import { YTNodes } from 'youtubei.js';
import { getClient, getThumbnail, getThumbnailId } from './utils';

export default async function(id: string) {
  const yt = await getClient();
  const artist = await yt.music.getArtist(id);

  let name = '';
  let thumbnails: { url: string; width: number; height: number }[] = [];

  const header = artist.header;
  if (header?.is(YTNodes.MusicImmersiveHeader)) {
    const immersiveHeader = header.as(YTNodes.MusicImmersiveHeader);
    name = immersiveHeader.title.text || '';
    thumbnails = immersiveHeader.thumbnail?.contents || [];
  } else if (header?.is(YTNodes.MusicVisualHeader)) {
    const visualHeader = header.as(YTNodes.MusicVisualHeader);
    name = visualHeader.title.text || '';
    thumbnails = visualHeader.thumbnail || [];
  }

  const songsSection = artist.sections?.find(s => s.is(YTNodes.MusicShelf) && s.as(YTNodes.MusicShelf).title?.text?.toLowerCase().includes('songs'))?.as(YTNodes.MusicShelf);
  const albumsSection = artist.sections?.find(s => s.is(YTNodes.MusicCarouselShelf) && s.as(YTNodes.MusicCarouselShelf).header?.is(YTNodes.MusicCarouselShelfBasicHeader) && s.as(YTNodes.MusicCarouselShelf).header?.as(YTNodes.MusicCarouselShelfBasicHeader).title?.text?.toLowerCase().includes('albums'))?.as(YTNodes.MusicCarouselShelf);

  const items = (songsSection?.contents || []).map((item) => {
    if (item.is(YTNodes.MusicResponsiveListItem)) {
      const musicItem = item.as(YTNodes.MusicResponsiveListItem);
      const album = musicItem.album?.name;
      const views = musicItem.views?.toString();
      const subtext = (album || '') + (views ? (album ? ' • ' : '') + views : '');
      return {
        id: musicItem.id || '',
        title: musicItem.title || '',
        author: musicItem.author?.name || name,
        authorId: musicItem.author?.channel_id || '',
        duration: musicItem.duration?.text || '',
        albumId: musicItem.album?.id || '',
        type: 'video' as const,
        subtext
      };
    }
    return null;
  }).filter((i): i is NonNullable<typeof i> => i !== null);

  const albums = (albumsSection?.contents || []).map((item) => {
    if (item.is(YTNodes.MusicResponsiveListItem)) {
      const musicItem = item.as(YTNodes.MusicResponsiveListItem);
      return {
        id: musicItem.id || '',
        name: musicItem.title || '',
        img: '/' + getThumbnailId(getThumbnail(musicItem.thumbnail?.contents || [])),
        year: musicItem.year || '',
        type: 'album' as const,
        author: name
      };
    }
    return null;
  }).filter((i): i is NonNullable<typeof i> => i !== null);

  return {
    id,
    name,
    img: '/' + getThumbnailId(getThumbnail(thumbnails)),
    items,
    albums,
    type: 'artist' as const
  };
}
