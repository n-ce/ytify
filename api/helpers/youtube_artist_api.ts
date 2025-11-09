const YOUTUBE_MUSIC_API_URL = 'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false';

export interface MusicShelfRendererContainer {
  musicShelfRenderer: {
    title: { runs: { text: string }[] };
    contents: {
      musicResponsiveListItemRenderer: {
        flexColumns: {
          musicResponsiveListItemFlexColumnRenderer: {
            text: {
              runs: {
                text: string;
                navigationEndpoint?: {
                  watchEndpoint: { playlistId: string };
                };
              }[];
            };
          };
        }[];
      };
    }[];
  };
}

export interface MusicCarouselShelfRendererContainer {
  musicCarouselShelfRenderer: {
    header: {
      musicCarouselShelfBasicHeaderRenderer: {
        title: { runs: { text: string }[] };
      };
    };
    contents: {
      musicTwoRowItemRenderer: {
        title: { runs: { text: string }[] };
        navigationEndpoint: {
          browseEndpoint: { browseId: string };
        };
        thumbnailRenderer: {
          musicThumbnailRenderer: {
            thumbnail: { thumbnails: { url: string }[] };
          };
        };
      };
    }[];
  };
}

export interface ResponseData {
  header: {
    musicImmersiveHeaderRenderer: {
      title: { runs: { text: string }[] };
    };
  };
  contents: {
    singleColumnBrowseResultsRenderer: {
      tabs: {
        tabRenderer: {
          content: {
            sectionListRenderer: {
              contents: (MusicShelfRendererContainer | MusicCarouselShelfRendererContainer)[];
            };
          };
        };
      }[];
    };
  };
}

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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data: ResponseData) => {
      const contents = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents;

      const artistName = data.header.musicImmersiveHeaderRenderer.title.runs[0].text;

      const topSongsShelf = contents.find(
        (item): item is MusicShelfRendererContainer =>
          'musicShelfRenderer' in item &&
          item.musicShelfRenderer.title.runs[0].text === 'Top songs'
      );
      const playlistId = topSongsShelf?.musicShelfRenderer.contents[0].musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint?.watchEndpoint.playlistId;

      const recommendedArtistsShelf = contents.find(
        (item): item is MusicCarouselShelfRendererContainer =>
          'musicCarouselShelfRenderer' in item &&
          item.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text === 'Fans might also like'
      );
      const recommendedArtists = recommendedArtistsShelf?.musicCarouselShelfRenderer.contents.map(
        (item) => ({
          name: item.musicTwoRowItemRenderer.title.runs[0].text,
          browseId: item.musicTwoRowItemRenderer.navigationEndpoint.browseEndpoint.browseId,
          thumbnail: item.musicTwoRowItemRenderer.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url,
        })
      );

      const featuredOnShelf = contents.find(
        (item): item is MusicCarouselShelfRendererContainer =>
          'musicCarouselShelfRenderer' in item &&
          item.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text === 'Featured on'
      );
      const featuredOnPlaylists = featuredOnShelf?.musicCarouselShelfRenderer.contents.map(
        (item) => ({
          title: item.musicTwoRowItemRenderer.title.runs[0].text,
          browseId: item.musicTwoRowItemRenderer.navigationEndpoint.browseEndpoint.browseId,
          thumbnail: item.musicTwoRowItemRenderer.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url,
        })
      );

      const albumsShelf = contents.find(
        (item): item is MusicCarouselShelfRendererContainer =>
          'musicCarouselShelfRenderer' in item &&
          item.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text === 'Albums'
      );
      const albums = albumsShelf?.musicCarouselShelfRenderer.contents.map(
        (item) => ({
          title: item.musicTwoRowItemRenderer.title.runs[0].text,
          browseId: item.musicTwoRowItemRenderer.navigationEndpoint.browseEndpoint.browseId,
          thumbnail: item.musicTwoRowItemRenderer.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url,
        })
      );

      return {
        artistName,
        playlistId,
        recommendedArtists,
        featuredOnPlaylists,
        albums,
      };
    });
}
