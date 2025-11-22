// backend/services/youtube_artist.ts

import type { MusicCarouselShelfRendererContainer, MusicShelfRendererContainer, ResponseData } from "./youtube_common.js";

const YOUTUBE_MUSIC_API_URL = 'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false';

export async function getArtistData(artistId: string, countryCode: string = 'US') {
  const requestBody = {
    browseId: artistId,
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20250915.03.00',
        gl: countryCode,
      },
    },
  };

  return fetch(YOUTUBE_MUSIC_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then((data: ResponseData) => {
    if (!data.header?.musicImmersiveHeaderRenderer) {
      return {};
    }
    const contents = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents;
    const artistName = data.header.musicImmersiveHeaderRenderer.title.runs[0].text;
    const thumbnail = data.header.musicImmersiveHeaderRenderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url || '';

    const topSongsShelf = contents.find(
      (item): item is MusicShelfRendererContainer => 'musicShelfRenderer' in item && item.musicShelfRenderer.title.runs[0].text === 'Top songs'
    );
    const playlistId = topSongsShelf?.musicShelfRenderer.contents[0].musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint?.watchEndpoint.playlistId;

    const recommendedArtistsShelf = contents.find(
      (item): item is MusicCarouselShelfRendererContainer => 'musicCarouselShelfRenderer' in item && item.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text === 'Fans might also like'
    );
    const recommendedArtists = recommendedArtistsShelf?.musicCarouselShelfRenderer.contents.map(
      (item) => ({
        name: item.musicTwoRowItemRenderer.title.runs[0].text,
        browseId: item.musicTwoRowItemRenderer.navigationEndpoint.browseEndpoint?.browseId,
        thumbnail: item.musicTwoRowItemRenderer.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url,
      })
    );

    const featuredOnShelf = contents.find(
      (item): item is MusicCarouselShelfRendererContainer => 'musicCarouselShelfRenderer' in item && item.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text === 'Featured on'
    );
    const featuredOnPlaylists = featuredOnShelf?.musicCarouselShelfRenderer.contents.map(
      (item) => ({
        title: item.musicTwoRowItemRenderer.title.runs[0].text,
        browseId: item.musicTwoRowItemRenderer.navigationEndpoint.browseEndpoint?.browseId,
        thumbnail: item.musicTwoRowItemRenderer.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url,
      })
    );

    const albumsShelf = contents.find(
      (item): item is MusicCarouselShelfRendererContainer => 'musicCarouselShelfRenderer' in item && item.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text === 'Albums'
    );
    const albums = albumsShelf?.musicCarouselShelfRenderer.contents.map(
      (item) => {
        const shufflePlayItem = item.musicTwoRowItemRenderer.menu?.menuRenderer.items.find(
          (menuItem) => menuItem.menuNavigationItemRenderer.text.runs[0].text === 'Shuffle play'
        );
        let playlistId = shufflePlayItem?.menuNavigationItemRenderer.navigationEndpoint.watchPlaylistEndpoint.playlistId;

        if (playlistId && playlistId.startsWith('VL')) {
          playlistId = playlistId.substring(2);
        }

        return {
          id: playlistId,
          subtitle: item.musicTwoRowItemRenderer.subtitle.runs.slice(-1)[0].text,
          thumbnail: item.musicTwoRowItemRenderer.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url,
          title: item.musicTwoRowItemRenderer.title.runs[0].text,
        };
      }
    );

    return {
      artistName,
      thumbnail,
      playlistId,
      recommendedArtists,
      featuredOnPlaylists,
      albums,
    };
  });
}

export async function getArtistsData(artistIdParam: string | string[], countryCode: string = 'US') {
  if (typeof artistIdParam === 'string' && artistIdParam.includes(',')) {
    const artistIds = artistIdParam.split(',');
    const artistDataPromises = artistIds.map(id => getArtistData(id, countryCode));
    const results = await Promise.all(artistDataPromises);
    const resultsWithoutAlbums = results.map((artist: any) => {
      if (artist && typeof artist === 'object' && 'albums' in artist) {
        const { albums, ...rest } = artist;
        return rest;
      }
      return artist;
    });
    return resultsWithoutAlbums;
  } else {
    const artistData = await getArtistData(artistIdParam as string, countryCode);
    if (!artistData || Object.keys(artistData).length === 0) {
      throw new Error('Artist not found');
    }
    const { artistName, playlistId, albums, thumbnail } = artistData as any;
    return { artistName, playlistId, albums, thumbnail };
  }
}