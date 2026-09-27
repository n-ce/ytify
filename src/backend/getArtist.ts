import { YTNodes, type Helpers, type Innertube } from 'youtubei.js';
import { getClient, getThumbnail, formatThumbnailId, formatDuration, getVideoId } from './utils.js';

const DISCOGRAPHY_PAGE = 'MUSIC_PAGE_TYPE_ARTIST_DISCOGRAPHY';

// The artist page's Albums / Singles & EPs carousels are capped at 10 items and
// carry no continuation, so long discographies are silently truncated. The full
// list lives behind the discography page ("More" in a carousel header), whose
// Albums / Singles & EPs filter chips each yield a complete grid. Neither the
// endpoint nor the chips are modelled by youtubei.js, so the raw payload is
// walked structurally.
function walkRaw(node: unknown, visit: (node: any) => void): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walkRaw(child, visit);
    return;
  }
  visit(node);
  for (const child of Object.values(node)) walkRaw(child, visit);
}

const rawText = (node?: { runs?: { text?: string }[] }): string =>
  node?.runs?.map((run) => run.text || '').join('') || '';

function findDiscographyEndpoint(
  payload: unknown,
): { browseId: string; params: string } | null {
  let found: { browseId: string; params: string } | null = null;
  walkRaw(payload, (node) => {
    const endpoint = node.browseEndpoint;
    if (found || !endpoint?.browseId || !endpoint?.params) return;
    const pageType = endpoint.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
    if (pageType === DISCOGRAPHY_PAGE) found = { browseId: endpoint.browseId, params: endpoint.params };
  });
  return found;
}

function findChipContinuation(payload: unknown, label: RegExp): string | null {
  let found: string | null = null;
  walkRaw(payload, (node) => {
    if (found || !node.chipCloudChipRenderer) return;
    const chip = node.chipCloudChipRenderer;
    if (!label.test(rawText(chip.text))) return;
    found = chip.navigationEndpoint?.browseSectionListReloadEndpoint?.continuation?.reloadContinuationData?.continuation || null;
  });
  return found;
}

// Discography rows label the release ("Album • 2018", "EP • 2020", "Single • 2025")
// and carry no `year` field, unlike the top-level carousel items.
function mapDiscographyRow(row: any, author: string) {
  const subtitle = rawText(row.subtitle);
  return {
    kind: /^(Album|EP|Single)\b/.exec(subtitle)?.[1] || 'Album',
    album: {
      id: row.navigationEndpoint?.browseEndpoint?.browseId || '',
      name: rawText(row.title),
      img: formatThumbnailId(getThumbnail(row.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [])),
      year: row.year || /\b(?:19|20)\d{2}\b/.exec(subtitle)?.[0] || '',
      type: 'album' as const,
      author,
    },
  };
}

async function getDiscography(yt: Innertube, id: string, author: string) {
  const browse = async (args: Record<string, unknown>) =>
    (await yt.actions.execute('/browse', { ...args, client: 'YTMUSIC', parse: false })).data as any;

  const endpoint = findDiscographyEndpoint(await browse({ browseId: id }));
  if (!endpoint) return null;

  const discography = { browseId: endpoint.browseId, params: decodeURIComponent(endpoint.params) };
  const page = await browse(discography);

  const albumsToken = findChipContinuation(page, /^Albums$/);
  if (!albumsToken) return null;
  const singlesToken = findChipContinuation(page, /^Singles/);

  const rows = (payload: unknown) => {
    const mapped: ReturnType<typeof mapDiscographyRow>[] = [];
    walkRaw(payload, (node) => {
      if (node.musicTwoRowItemRenderer) mapped.push(mapDiscographyRow(node.musicTwoRowItemRenderer, author));
    });
    return mapped;
  };

  const [albumsPage, singlesPage] = await Promise.all([
    browse({ ...discography, continuation: albumsToken }),
    singlesToken ? browse({ ...discography, continuation: singlesToken }) : null,
  ]);

  return {
    albums: rows(albumsPage).map((row) => row.album),
    eps: singlesPage
      ? rows(singlesPage).filter((row) => row.kind === 'EP').map((row) => row.album)
      : [],
  };
}

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
        id: getVideoId(musicItem),
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

  let albums: NonNullable<YTArtistItem['albums']> = [];
  let eps: NonNullable<YTArtistItem['eps']> = [];

  try {
    const discography = await getDiscography(yt, id, name);
    if (discography) ({ albums, eps } = discography);
  } catch (e) {
    console.error(`Failed to load discography for ${id}:`, e);
  }

  if (!albums.length) {
    const albumsSection = artist.sections?.find(s => s.is(YTNodes.MusicCarouselShelf) && s.as(YTNodes.MusicCarouselShelf).header?.is(YTNodes.MusicCarouselShelfBasicHeader) && s.as(YTNodes.MusicCarouselShelf).header?.as(YTNodes.MusicCarouselShelfBasicHeader).title?.text === 'Albums')?.as(YTNodes.MusicCarouselShelf);
    const singlesSection = artist.sections?.find(s => s.is(YTNodes.MusicCarouselShelf) && s.as(YTNodes.MusicCarouselShelf).header?.is(YTNodes.MusicCarouselShelfBasicHeader) && (s.as(YTNodes.MusicCarouselShelf).header?.as(YTNodes.MusicCarouselShelfBasicHeader).title?.text === 'Singles' || s.as(YTNodes.MusicCarouselShelf).header?.as(YTNodes.MusicCarouselShelfBasicHeader).title?.text?.includes('Singles')))?.as(YTNodes.MusicCarouselShelf);

    const mapAlbum = (item: Helpers.YTNode) => {
      if (item.is(YTNodes.MusicTwoRowItem)) {
        const musicItem = item.as(YTNodes.MusicTwoRowItem);
        return {
          id: musicItem.id || '',
          name: musicItem.title.toString() || '',
          img: formatThumbnailId(getThumbnail(musicItem.thumbnail || [])),
          year: musicItem.year || '',
          type: 'album' as const,
          author: name
        };
      }
      return null;
    };

    const collect = (section: typeof albumsSection) =>
      (section?.contents || [])
        .map(mapAlbum)
        .filter((i): i is NonNullable<ReturnType<typeof mapAlbum>> => i !== null);

    albums = collect(albumsSection);
    eps = collect(singlesSection).filter((album) =>
      singlesSection?.contents?.some((item) =>
        item.is(YTNodes.MusicTwoRowItem) &&
        item.as(YTNodes.MusicTwoRowItem).id === album.id &&
        item.as(YTNodes.MusicTwoRowItem).subtitle?.toString()?.toLowerCase().includes('ep')
      )
    );
  }

  return {
    id,
    name,
    img: formatThumbnailId(getThumbnail(thumbnails)),
    items,
    albums,
    eps,
    type: 'artist' as const
  };
}
