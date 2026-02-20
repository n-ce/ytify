import { YTNodes, type Helpers } from 'youtubei.js';
import { getClient, getThumbnail, getThumbnailId, formatDuration } from './utils.js';

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

  let songItems: Helpers.YTNode[] = [];
  try {
    const songs = await artist.getAllSongs();
    if (songs && songs.contents) {
      songItems = songs.contents;
    }
  } catch (e) {
    console.error('Error fetching all songs:', e);
    const songsSection = artist.sections?.find(s => s.is(YTNodes.MusicShelf) && s.as(YTNodes.MusicShelf).title?.text?.toLowerCase().includes('songs'))?.as(YTNodes.MusicShelf);
    if (songsSection) {
      songItems = songsSection.contents;
    }
  }

  const items = songItems.map((item) => {
    if (item.is(YTNodes.MusicResponsiveListItem)) {
      const musicItem = item.as(YTNodes.MusicResponsiveListItem);
      const album = musicItem.album?.name;
      const views = musicItem.views?.toString();
      const subtext = (album || '') + (views ? (album ? ' • ' : '') + views : '');

      let duration = musicItem.duration?.text;
      if (!duration && musicItem.subtitle) {
        duration = musicItem.subtitle.runs?.find(r => r.text && /^(\d+:)?\d+:\d+$/.test(r.text))?.text;
      }
      if (!duration && musicItem.fixed_columns) {
        const fixedColumn = musicItem.fixed_columns.find(c => c.is(YTNodes.MusicResponsiveListItemFixedColumn));
        if (fixedColumn) {
          duration = fixedColumn.as(YTNodes.MusicResponsiveListItemFixedColumn).title.toString();
        }
      }

      return {
        id: musicItem.id || '',
        title: musicItem.title || '',
        author: musicItem.author?.name || musicItem.artists?.[0]?.name || name,
        authorId: musicItem.author?.channel_id || musicItem.artists?.[0]?.channel_id || id,
        duration: formatDuration(duration),
        albumId: musicItem.album?.id || '',
        type: 'song' as const,
        subtext
      };
    }
    return null;
  }).filter((i): i is NonNullable<typeof i> => i !== null);

  const albumsSection = artist.sections?.find(s => s.is(YTNodes.MusicCarouselShelf) && s.as(YTNodes.MusicCarouselShelf).header?.is(YTNodes.MusicCarouselShelfBasicHeader) && s.as(YTNodes.MusicCarouselShelf).header?.as(YTNodes.MusicCarouselShelfBasicHeader).title?.text === 'Albums')?.as(YTNodes.MusicCarouselShelf);
  const singlesSection = artist.sections?.find(s => s.is(YTNodes.MusicCarouselShelf) && s.as(YTNodes.MusicCarouselShelf).header?.is(YTNodes.MusicCarouselShelfBasicHeader) && (s.as(YTNodes.MusicCarouselShelf).header?.as(YTNodes.MusicCarouselShelfBasicHeader).title?.text === 'Singles' || s.as(YTNodes.MusicCarouselShelf).header?.as(YTNodes.MusicCarouselShelfBasicHeader).title?.text?.includes('Singles')))?.as(YTNodes.MusicCarouselShelf);

  const mapAlbum = (item: Helpers.YTNode) => {
    if (item.is(YTNodes.MusicTwoRowItem)) {
      const musicItem = item.as(YTNodes.MusicTwoRowItem);
      const isEP = musicItem.subtitle?.toString()?.toLowerCase().includes('ep');

      // If it's from Singles section, only keep it if it's an EP
      if (singlesSection?.contents?.includes(item) && !isEP) return null;

      return {
        id: musicItem.id || '',
        name: musicItem.title.toString() || '',
        img: '/' + getThumbnailId(getThumbnail(musicItem.thumbnail || [])),
        year: musicItem.year || '',
        type: 'album' as const,
        author: name
      };
    }
    return null;
  };

  const albumList = (albumsSection?.contents || []).map(mapAlbum).filter((i): i is NonNullable<ReturnType<typeof mapAlbum>> => i !== null);
  const epList = (singlesSection?.contents || []).map(mapAlbum).filter((i): i is NonNullable<ReturnType<typeof mapAlbum>> => i !== null);

  return {
    id,
    name,
    img: '/' + getThumbnailId(getThumbnail(thumbnails)),
    items,
    albums: [...albumList, ...epList],
    type: 'artist' as const
  };
}
