// backend/services/youtube_common.ts

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
        subtitle: { runs: { text: string }[] };
        navigationEndpoint: {
          browseEndpoint?: { browseId: string };
          watchEndpoint?: { playlistId: string };
        };
        thumbnailRenderer: {
          musicThumbnailRenderer: {
            thumbnail: { thumbnails: { url: string }[] };
          };
        };
        menu?: {
          menuRenderer: {
            items: {
              menuNavigationItemRenderer: {
                text: { runs: { text: string }[] };
                navigationEndpoint: {
                  watchPlaylistEndpoint: { playlistId: string };
                };
              };
            }[];
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
      thumbnail: {
        musicThumbnailRenderer: {
          thumbnail: {
            thumbnails: { url: string }[];
          };
        };
      };
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
