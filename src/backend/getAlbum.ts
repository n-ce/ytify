import { YTNodes } from 'youtubei.js';
import { getClient, getThumbnail, formatDuration, getThumbnailId } from './utils.js';

export default async function(id: string) {
  const yt = await getClient();
  const album = await yt.music.getAlbum(id);

  let name = '';
  let author = '';
  let thumbnails: { url: string; width: number; height: number }[] = [];
  let year = '';
  let playlistId = '';

  const header = album.header;
  let authorId = '';

  if (header?.is(YTNodes.MusicDetailHeader)) {
    const detailHeader = header.as(YTNodes.MusicDetailHeader);
    name = detailHeader.title.text || '';
    author = detailHeader.author?.name || '';
    authorId = detailHeader.author?.channel_id || '';
    thumbnails = detailHeader.thumbnails;
    year = detailHeader.year || '';

    const subtitleRuns = detailHeader.subtitle?.runs || [];
    if (!author || !authorId) {
      const artistRun = subtitleRuns.find((r) => 
        ('endpoint' in r && (r as any).endpoint?.payload?.browseId?.startsWith('UC')) ||
        ('endpoint' in r && (r as any).endpoint?.browseId?.startsWith('UC'))
      ) as any;
      if (artistRun) {
        author = author || artistRun.text || '';
        authorId = authorId || artistRun.endpoint?.payload?.browseId || artistRun.endpoint?.browseId;
      }
    }
    if (!year) {
      year = subtitleRuns.find((r) => /^\d{4}$/.test(r.text || ''))?.text || '';
    }
    if (!year && detailHeader.second_subtitle) {
      year = detailHeader.second_subtitle.runs?.find((r) => /^\d{4}$/.test(r.text || ''))?.text || '';
    }
    if (thumbnails.length === 0 && (detailHeader as any).thumbnail) {
      thumbnails = (detailHeader as any).thumbnail.contents || [];
    }
  } else if (header?.is(YTNodes.MusicResponsiveHeader)) {
    const responsiveHeader = header.as(YTNodes.MusicResponsiveHeader);
    name = responsiveHeader.title.text || '';
    thumbnails = (responsiveHeader as any).thumbnail?.contents || [];

    const strapline = (responsiveHeader as any).strapline_text_one;
    if (strapline) {
      author = strapline.text || '';
      const run = strapline.runs?.[0];
      if (run && run.endpoint) {
        authorId = run.endpoint.payload?.browseId || run.endpoint.browseId;
      }
    }

    const subtitleRuns = responsiveHeader.subtitle?.runs || [];
    if (subtitleRuns.length > 0) {
      if (!author || !authorId) {
        const artistRun = subtitleRuns.find((r) => 
          ('endpoint' in r && (r as any).endpoint?.payload?.browseId?.startsWith('UC')) ||
          ('endpoint' in r && (r as any).endpoint?.browseId?.startsWith('UC'))
        ) as any;
        if (artistRun) {
          author = author || artistRun.text || '';
          authorId = authorId || (artistRun as any).endpoint?.payload?.browseId || (artistRun as any).endpoint?.browseId;
        }
      }
      if (!year) {
        year = subtitleRuns.find((r) => /^\d{4}$/.test(r.text || ''))?.text || '';
      }
    }
  }

  // Extract playlistId from buttons or menu
  const playButton = (header as any)?.buttons?.find((b: any) => b.type === 'MusicPlayButton');
  if (playButton) {
    playlistId = playButton.endpoint?.payload?.playlistId;
  }

  if (!playlistId) {
    const menu = (header as any)?.menu || (header as any)?.buttons?.find((b: any) => b.type === 'Menu');
    const shuffleItem = menu?.items?.find((i: any) => i.endpoint?.payload?.playlistId && i.icon_type === 'MUSIC_SHUFFLE');
    if (shuffleItem) {
      playlistId = shuffleItem.endpoint.payload.playlistId;
    }
  }

  let finalItems: any[] = [];

  if (playlistId) {
    try {
      const playlist = await yt.music.getPlaylist(playlistId);
      if (playlist.contents) {
        finalItems = (playlist.contents || []).map((item) => {
          if (item.is(YTNodes.MusicResponsiveListItem)) {
            const musicItem = item.as(YTNodes.MusicResponsiveListItem);
            const videoId = musicItem.id || (musicItem as any).videoId;
            if (!videoId) return null;

            const itemAuthor = musicItem.author?.name || (musicItem as any).authors?.[0]?.name || musicItem.artists?.[0]?.name || author || '';
            const itemAuthorId = musicItem.author?.channel_id || (musicItem as any).authors?.[0]?.channel_id || musicItem.artists?.[0]?.channel_id || authorId || '';

            return {
              id: videoId,
              title: musicItem.title || '',
              author: itemAuthor,
              authorId: itemAuthorId,
              duration: formatDuration(musicItem.duration?.text),
              albumId: id,
              type: 'song' as const,
              subtext: name
            };
          }
          return null;
        }).filter((item): item is NonNullable<typeof item> => item !== null);
      }
    } catch (e) {
      console.error('Error fetching album playlist:', e);
    }
  }

  // Fallback to direct album contents if playlist fetch failed or returned nothing
  if (finalItems.length === 0) {
    finalItems = (album.contents || []).map((item) => {
      if (item.is(YTNodes.MusicResponsiveListItem)) {
        const musicItem = item.as(YTNodes.MusicResponsiveListItem);
        const videoId = musicItem.id || (musicItem as any).videoId;
        if (!videoId) return null;

        const itemAuthor = musicItem.author?.name || (musicItem as any).authors?.[0]?.name || musicItem.artists?.[0]?.name || author || '';
        const itemAuthorId = musicItem.author?.channel_id || (musicItem as any).authors?.[0]?.channel_id || musicItem.artists?.[0]?.channel_id || authorId || '';

        return {
          id: videoId,
          title: musicItem.title || '',
          author: itemAuthor,
          authorId: itemAuthorId,
          duration: formatDuration(musicItem.duration?.text),
          albumId: id,
          type: 'song' as const,
          subtext: name
        };
      }
      return null;
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }

  return {
    id: id,
    name,
    author,
    year,
    img: '/' + getThumbnailId(getThumbnail(thumbnails)),
    items: finalItems,
    type: 'album' as const
  };
}
