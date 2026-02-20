import { Helpers, YTNodes, type Innertube } from 'youtubei.js';
import { getClient, getThumbnail, getThumbnailId } from './utils.js';

async function fetchFullArtistData(yt: Innertube, id: string) {
  try {
    const artist = await yt.music.getArtist(id);
    let title = '';
    let thumbnails: { url: string; width: number; height: number }[] = [];

    const header = artist.header;
    if (header?.is(YTNodes.MusicImmersiveHeader)) {
      const h = header.as(YTNodes.MusicImmersiveHeader);
      title = h.title.text || '';
      thumbnails = h.thumbnail?.contents || [];
    } else if (header?.is(YTNodes.MusicVisualHeader)) {
      const h = header.as(YTNodes.MusicVisualHeader);
      title = h.title.text || '';
      thumbnails = h.thumbnail || [];
    }


    function findCarouselByTitle(sections: Helpers.YTNode[] | undefined, targetTitle: string): YTNodes.MusicCarouselShelf | undefined {
      return sections?.find((section): section is YTNodes.MusicCarouselShelf => {
        if (!section.is(YTNodes.MusicCarouselShelf)) return false;

        const header = section.header;
        if (header?.is(YTNodes.MusicCarouselShelfBasicHeader)) {
          // Access the text property safely
          return header.title?.toString() === targetTitle;
        }

        return false;
      });
    }

    const playlistsSection = findCarouselByTitle(artist.sections, 'Featured on');
    const relatedSection = findCarouselByTitle(artist.sections, 'Fans might also like');


    const featuredOnPlaylists = (playlistsSection?.contents || [])
      .map((item) => {
        // Carousels use TwoRowItem, not ResponsiveListItem
        if (item.is(YTNodes.MusicTwoRowItem)) {
          const musicItem = item.as(YTNodes.MusicTwoRowItem);
          return {
            id: musicItem.id || '',
            name: musicItem.title?.toString() || '',
            img: '/' + getThumbnailId(getThumbnail(musicItem.thumbnail || [])),
            author: title,
            type: 'playlist' as const
          };
        }
        return null;
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    const recommendedArtists = (relatedSection?.contents || [])
      .map((item) => {
        if (item.is(YTNodes.MusicTwoRowItem)) {
          const musicItem = item.as(YTNodes.MusicTwoRowItem);
          return {
            id: musicItem.id || '',
            name: musicItem.title?.toString() || '',
            img: '/' + getThumbnailId(getThumbnail(musicItem.thumbnail || [])),
            type: 'artist' as const
          };
        }
        return null;
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);



    return {
      id,
      title,
      img: '/' + getThumbnailId(getThumbnail(thumbnails)),
      featuredOnPlaylists,
      recommendedArtists
    };
  } catch (e) {
    console.error(`Failed to fetch artist ${id}`, e);
    return null;
  }
}

export default async function(ids: string[]) {
  const yt = await getClient();
  const results = (await Promise.all(ids.map(id => fetchFullArtistData(yt, id)))).filter((r): r is NonNullable<typeof r> => r !== null);

  const recommendedArtistMap: Record<string, YTListItem & { count: number }> = {};
  const relatedPlaylistMap: Record<string, YTListItem & { count: number }> = {};

  for (const result of results) {
    result.recommendedArtists.forEach((artist) => {
      if (!ids.includes(artist.id)) {
        if (recommendedArtistMap[artist.id]) {
          recommendedArtistMap[artist.id].count++;
        } else {
          recommendedArtistMap[artist.id] = { ...artist, count: 1 };
        }
      }
    });

    result.featuredOnPlaylists.forEach((playlist) => {
      if (relatedPlaylistMap[playlist.id]) {
        relatedPlaylistMap[playlist.id].count++;
      } else {
        relatedPlaylistMap[playlist.id] = { ...playlist, count: 1 };
      }
    });
  }

  const relatedArtists = Object.values(recommendedArtistMap)
    .filter(a => a.count > 1)
    .sort((a, b) => b.count - a.count)
    .map(({ count, ...artist }) => artist);

  const relatedPlaylists = Object.values(relatedPlaylistMap)
    .filter(p => p.count > 1)
    .sort((a, b) => b.count - a.count)
    .map(({ count, ...playlist }) => playlist);

  const userArtists = results.map(r => ({
    id: r.id,
    name: r.title,
    img: r.img,
    type: 'artist' as const
  }));

  return {
    userArtists,
    relatedArtists,
    relatedPlaylists
  };
}
