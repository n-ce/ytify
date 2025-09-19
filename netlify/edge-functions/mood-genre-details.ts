import type { Config, Context } from "@netlify/edge-functions";

const YOUTUBE_MUSIC_API_URL = 'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false';

// Type for the individual playlist item in the details view
interface MusicTwoRowItemRenderer {
  title: {
    runs: Array<{ text: string }>;
  };
  thumbnailRenderer: {
    musicThumbnailRenderer: {
      thumbnail: {
        thumbnails: Array<{ url: string }>;
      };
    };
  };
  navigationEndpoint: {
    browseEndpoint: {
      browseId: string;
    };
  };
}

interface PlaylistItemWrapper {
  musicTwoRowItemRenderer: MusicTwoRowItemRenderer;
}

// Type for the processed playlist item
export interface PlaylistItem {
  title: string;
  thumbnail: string;
  id: string;
}

// New type for the response from /mood-genre-details
export type MoodGenreDetailsFullResponse = Record<string, PlaylistItem[]>;

export default async (_req: Request, context: Context) => {
  const { params } = context.params;

  if (!params) {
    return new Response(JSON.stringify({ error: 'Missing "params" path parameter' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const requestBody = {
    browseId: 'FEmusic_moods_and_genres_category', // Fixed as per mgf.ts
    params: params,
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20250915.03.00',
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
  .then((data: any) => {
    const sectionListRendererContents = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
      .sectionListRenderer.contents;

    const responsePayload: MoodGenreDetailsFullResponse = {};

    sectionListRendererContents.forEach((section: any) => {
      if (section.musicCarouselShelfRenderer) {
        const musicCarouselShelfRenderer = section.musicCarouselShelfRenderer;

        const header = musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text;
        const playlistsData: PlaylistItemWrapper[] = musicCarouselShelfRenderer.contents;

        const playlists: PlaylistItem[] = playlistsData.map((item: PlaylistItemWrapper) => {
          const playlistRenderer = item.musicTwoRowItemRenderer;

          const id = playlistRenderer.navigationEndpoint.browseEndpoint.browseId;

          return {
            title: playlistRenderer.title.runs[0].text,
            thumbnail: playlistRenderer.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url,
            id: id,
          };
        });
        responsePayload[header] = playlists;
      }
    });

    return new Response(JSON.stringify(responsePayload), {
      headers: { 'content-type': 'application/json' },
    });
  })
  .catch((error) => {
    console.error('There was a problem with the fetch operation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
    });
  });
};

export const config: Config = {
  path: '/mood-genre-details/:params',
};