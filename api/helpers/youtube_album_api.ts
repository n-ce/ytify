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

interface ResponseData {
  header?: {
    musicDetailHeaderRenderer?: {
      title: { runs: { text: string }[] };
      subtitle: { runs: { text: string }[] };
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
              contents: MusicShelfRenderer[];
            };
          };
        };
      }[];
    };
  };
}

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
      if (!data.header?.musicDetailHeaderRenderer) {
        throw new Error('Album data not found');
      }

      const header = data.header.musicDetailHeaderRenderer;
      const title = header.title.runs[0].text;
      const thumbnail = header.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails.pop()?.url || ''; // Get the largest thumbnail
      
      // Subtitle runs usually look like: [Artist, " • ", Album, " • ", Year] or [Artist, " • ", Year]
      const subtitleRuns = header.subtitle.runs.map(r => r.text);
      const artist = subtitleRuns[0];
      const year = subtitleRuns[subtitleRuns.length - 1]; // Year is usually last

      // Get tracks
      const contents = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents;
      const shelf = contents.find(item => item.musicShelfRenderer);
      
      if (!shelf) {
         return { id: albumId, playlistId: albumId, title, artist, year, thumbnail, tracks: [] };
      }

      const tracks = shelf.musicShelfRenderer.contents.map((item) => {
        const renderer = item.musicResponsiveListItemRenderer;
        
        // Flex columns usually: [Title], [Artist], [Album], [Duration] (varies)
        // We rely on finding the videoId in the first column's navigationEndpoint
        const titleColumn = renderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0];
        const videoId = titleColumn.navigationEndpoint?.watchEndpoint?.videoId || '';
        const trackTitle = titleColumn.text;

        // Artist is usually in the second column
        const artistName = renderer.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer.text.runs[0]?.text || artist;

        // Duration is usually in the last fixed column
        const duration = renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer.text.runs[0]?.text || '';

        // Track thumbnail (if present, otherwise use album thumbnail)
        const trackThumb = renderer.thumbnail?.musicThumbnailRenderer.thumbnail.thumbnails[0].url || thumbnail;

        return {
          id: videoId, // Use videoId as the unique ID for the track
          title: trackTitle,
          artist: artistName,
          duration,
          thumbnail: trackThumb,
          videoId
        };
      }).filter(t => t.videoId); // Filter out items without a videoId (like headers or non-playable items)

      return {
        id: albumId,
        playlistId: albumId, // Albums in YT Music are often playable as playlists using their browseId (or a slight variation, but browseId often works for 'list=' param)
        title,
        artist,
        year,
        thumbnail,
        tracks
      };
    });
}