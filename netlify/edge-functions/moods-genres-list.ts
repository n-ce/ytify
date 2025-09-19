import type { Config, Context } from "@netlify/edge-functions";

const YOUTUBE_MUSIC_API_URL = 'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false';

// Type for the individual mood/genre item in the list
interface MusicNavigationButtonRenderer {
  buttonText: {
    runs: Array<{ text: string }>;
  };
  clickCommand: {
    browseEndpoint: {
      params: string;
      browseId?: string; // Optional, as mg.ts only uses params
    };
  };
}

interface MoodGenreListItem {
  musicNavigationButtonRenderer: MusicNavigationButtonRenderer;
}

// Type for the response from /moods-genres-list
export interface MoodsGenresListResponse {
  moods: Record<string, string>; // e.g., { "Happy": "params_string_for_happy" }
  genres: Record<string, string>; // e.g., { "Pop": "params_string_for_pop" }
}

export default async (_req: Request, context: Context) => {
  const countryCode = context.geo?.country?.code || 'US'; // Default to 'US' if not available

  const requestBody = {
    browseId: 'FEmusic_moods_and_genres',
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20250915.03.00',
        gl: countryCode, // Add geolocation parameter
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
    const content =
      data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
        .sectionListRenderer.contents;

    // Extract moods and their params
    const moodsItems: MoodGenreListItem[] = content[0].gridRenderer.items;
    const moods = moodsItems.reduce((acc: Record<string, string>, item: MoodGenreListItem) => {
      const text = item.musicNavigationButtonRenderer.buttonText.runs[0].text;
      const params = item.musicNavigationButtonRenderer.clickCommand.browseEndpoint.params;
      acc[text] = params;
      return acc;
    }, {} as Record<string, string>);

    // Extract genres and their params
    const genresItems: MoodGenreListItem[] = content[1].gridRenderer.items;
    const genres = genresItems.reduce((acc: Record<string, string>, item: MoodGenreListItem) => {
      const text = item.musicNavigationButtonRenderer.buttonText.runs[0].text;
      const params = item.musicNavigationButtonRenderer.clickCommand.browseEndpoint.params;
      acc[text] = params;
      return acc;
    }, {} as Record<string, string>);

    return new Response(JSON.stringify({ moods, genres } as MoodsGenresListResponse), {
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
  path: '/moods-genres-list',
};