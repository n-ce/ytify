const YOUTUBE_MUSIC_API_URL = 'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false';

interface MusicResponsiveListItemRenderer {
  musicResponsiveListItemRenderer: {
    fixedColumns: {
      musicResponsiveListItemFixedColumnRenderer: {
        text: {
          runs: {
            text: string;
          }[];
        };
      };
    }[];
    flexColumns: {
      musicResponsiveListItemFlexColumnRenderer: {
        text: {
          runs: {
            text: string;
            navigationEndpoint?: {
              watchEndpoint?: {
                videoId: string;
                playlistId?: string;
              };
              browseEndpoint?: {
                browseId: string;
              };
            };
          }[];
        };
      };
    }[];
    thumbnail?: {
      musicThumbnailRenderer: {
        thumbnail: {
          thumbnails: { url: string }[];
        };
      };
    };
  };
}

interface MusicShelfRenderer {
  musicShelfRenderer: {
    contents: MusicResponsiveListItemRenderer[];
  };
}

interface MusicDetailHeaderRenderer {
  title: { runs: { text: string }[] };
  subtitle: {
    runs: {
      text: string;
      navigationEndpoint?: {
        browseEndpoint?: {
          browseId: string;
        };
      };
    }[];
  };
  thumbnail: {
    musicThumbnailRenderer: {
      thumbnail: {
        thumbnails: { url: string }[];
      };
    };
  };
}

interface MusicResponsiveHeaderRenderer {
  musicResponsiveHeaderRenderer: {
    title: { runs: { text: string }[] };
    subtitle: { runs: { text: string }[] };
    straplineTextOne?: {
      runs: {
        text: string;
        navigationEndpoint?: {
          browseEndpoint?: {
            browseId: string;
          };
        };
      }[];
    };
    thumbnail: {
      musicThumbnailRenderer: {
        thumbnail: {
          thumbnails: { url: string }[];
        };
      };
    };
  };
}

interface ResponseData {
  header?: {
    musicDetailHeaderRenderer?: MusicDetailHeaderRenderer;
  };
  contents: {
    singleColumnBrowseResultsRenderer?: {
      tabs: {
        tabRenderer: {
          content: {
            sectionListRenderer: {
              contents: (MusicShelfRenderer | any)[];
            };
          };
        };
      }[];
    };
    twoColumnBrowseResultsRenderer?: {
      secondaryContents: {
        sectionListRenderer: {
          contents: (MusicShelfRenderer | any)[];
        };
      };
      tabs: {
        tabRenderer: {
          content: {
            sectionListRenderer: {
              contents: (MusicResponsiveHeaderRenderer | any)[];
            };
          };
        };
      }[];
    };
  };
  microformat?: {
    microformatDataRenderer: {
      urlCanonical: string;
      title: string;
      description: string;
      thumbnail: { thumbnails: { url: string }[] };
    };
  };
}

const formatThumbnail = (url: string) => {
  if (!url) return '';
  return url.includes('googleusercontent.com') ? (new URL(url).pathname).split('=')[0] : url;
};

export async function getAlbumData(albumId: string, countryCode: string = 'US') {
  const requestBody = {
    browseId: albumId,
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
      // console.log(JSON.stringify(data, null, 2));

      let title = '';
      let artist = '';
      let year = '';
      let thumbnail = '';
      let tracks: any[] = [];

      let playlistId = albumId;

      let authorId = '';

      // 1. Extract Metadata (Header)
      if (data.header?.musicDetailHeaderRenderer) {
        const header = data.header.musicDetailHeaderRenderer;
        title = header.title.runs[0]?.text || '';
        thumbnail = formatThumbnail(header.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails.pop()?.url || '');

        const subtitleRuns = header.subtitle.runs;
        artist = subtitleRuns[0]?.text || '';
        authorId = subtitleRuns[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
        year = subtitleRuns[subtitleRuns.length - 1]?.text || '';

      } else if (data.contents.twoColumnBrowseResultsRenderer) {
        // Try finding header in tabs
        const tabs = data.contents.twoColumnBrowseResultsRenderer.tabs;
        const headerItem = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.find(
          (item: any) => item.musicResponsiveHeaderRenderer
        );

        if (headerItem) {
          const header = headerItem.musicResponsiveHeaderRenderer;
          title = header.title.runs[0]?.text || '';
          thumbnail = formatThumbnail(header.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails.pop()?.url || '');

          // In this layout, artist is often in 'straplineTextOne'
          artist = header.straplineTextOne?.runs[0]?.text || '';
          authorId = header.straplineTextOne?.runs[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';

          // Year is usually in subtitle "Album • 2021"
          const yearRun = header.subtitle.runs.find((r: any) => /^\d{4}$/.test(r.text));
          year = yearRun?.text || '';
        }
      }

      // 2. Extract playlistId and Fallback Metadata
      if (data.microformat?.microformatDataRenderer) {
        const micro = data.microformat.microformatDataRenderer;

        // Extract OLAK... playlistId from canonical URL
        const urlMatch = micro.urlCanonical.match(/list=([^&]+)/);
        if (urlMatch) {
          playlistId = urlMatch[1];
        }

        if (!title) {
          const cleanTitle = micro.title.replace(/ - Album by .*$/, '');
          title = cleanTitle || micro.title;
          thumbnail = formatThumbnail(micro.thumbnail.thumbnails.pop()?.url || '');
        }
      }

      if (!title) {
        throw new Error('Album data not found');
      }

      // 3. Extract Tracks
      let shelf: MusicShelfRenderer | undefined;

      if (data.contents.singleColumnBrowseResultsRenderer) {
        const contents = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents;
        shelf = contents.find((item: any) => item.musicShelfRenderer);
      } else if (data.contents.twoColumnBrowseResultsRenderer) {
        const secondary = data.contents.twoColumnBrowseResultsRenderer.secondaryContents.sectionListRenderer.contents;
        shelf = secondary.find((item: any) => item.musicShelfRenderer);
      }

      if (shelf) {
        tracks = shelf.musicShelfRenderer.contents.map((item) => {
          const renderer = item.musicResponsiveListItemRenderer;
          if (!renderer) return null;

          const titleColumn = renderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs?.[0];
          const videoId = titleColumn?.navigationEndpoint?.watchEndpoint?.videoId || '';
          const trackTitle = titleColumn?.text || '';

          // If we couldn't get playlistId from microformat, try getting it from a track
          if (playlistId === albumId && titleColumn?.navigationEndpoint?.watchEndpoint?.playlistId) {
            playlistId = titleColumn.navigationEndpoint.watchEndpoint.playlistId;
          }

          // Artist is usually in the second column
          const artistRun = renderer.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer.text.runs?.[0];
          const artistName = artistRun?.text || artist;
          const trackAuthorId = artistRun?.navigationEndpoint?.browseEndpoint?.browseId || authorId;

          // Duration is usually in the last fixed column
          const duration = renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer.text.runs?.[0]?.text || '';

          // Track thumbnail
          const trackThumb = renderer.thumbnail?.musicThumbnailRenderer.thumbnail.thumbnails[0].url || thumbnail;

          const author = artistName.endsWith(' - Topic') ? artistName : `${artistName} - Topic`;

          return {
            id: videoId,
            title: trackTitle,
            author,
            authorId: trackAuthorId,
            duration,
            thumbnail: trackThumb,
            videoId
          };
        }).filter((t): t is any => !!t && !!t.videoId);
      }

      return {
        id: albumId,
        playlistId,
        title,
        author: artist,
        authorId,
        year,
        thumbnail,
        tracks
      };
    });
}
