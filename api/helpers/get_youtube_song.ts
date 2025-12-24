const YOUTUBE_MUSIC_SEARCH_URL = 'https://music.youtube.com/youtubei/v1/search';


export interface YouTubeSong {
  id: string,
  title: string,
  author: string,
  duration: string,
  authorId: string
}


export async function getYouTubeSong(query: string): Promise<YouTubeSong | {}> {
  const requestBody = {
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20250929.03.00',
      }
    },
    query: query,
  };


  try {
    const response = await fetch(YOUTUBE_MUSIC_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`);
      return {};
    }

    const data = await response.json();

    const contents = data.contents?.tabbedSearchResultsRenderer?.tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

    const isMixed = contents?.length === 2;
    const searchList = contents?.[1]?.musicShelfRenderer?.contents || [];

    for (const item of searchList) {

      const flexColumns = item.musicResponsiveListItemRenderer?.flexColumns;
      if (!flexColumns || flexColumns.length < 2) continue;

      const titleRun = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0];
      const title = titleRun?.text;
      const id = titleRun?.navigationEndpoint?.watchEndpoint?.videoId;

      if (!id) continue;

      const metadataRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
      if (!metadataRuns) continue;

      if (isMixed && metadataRuns[0].text !== 'Song') continue;


      const artistRun = metadataRuns.find((run: any) => run.navigationEndpoint?.browseEndpoint?.browseId);
      const author = artistRun?.text;
      const channelId = artistRun?.navigationEndpoint?.browseEndpoint?.browseId;

      const duration = metadataRuns.find((run: any) => run.text?.[run.text?.length - 3] === ':')?.text;

      if (duration)
        return {
          id,
          title,
          author: author + ' - Topic',
          duration,
          authorId: channelId
        };
    }

    if (isMixed) {
      const shelf = contents?.[0]?.musicCardShelfRenderer;

      if ('contents' in shelf) {
        for (const key in shelf.contents) {

          const fcs = shelf.contents[key]?.musicResponsiveListItemRenderer?.flexColumns;
          if (!fcs) continue;

          const fcx = fcs[1]?.musicResponsiveListItemFlexColumnRenderer;
          const details = fcx?.text?.runs;
          const isSong = details?.[0].text === 'Song';
          if (!isSong) continue;

          const titleColumnRenderer = fcs?.[0]?.musicResponsiveListItemFlexColumnRenderer;
          const titleRun = titleColumnRenderer?.text?.runs?.[0];
          const title = titleRun?.text;
          const id = titleRun?.navigationEndpoint?.watchEndpoint?.videoId;

          const authorRun = details?.[2];
          const author = authorRun?.text;
          const channelId = authorRun?.navigationEndpoint?.browseEndpoint?.browseId;
          const duration = details?.[4]?.text;
          if (duration.includes(':') && channelId)
            return {
              id,
              title,
              author: author + ' - Topic',
              duration,
              authorId: channelId
            };


        }

      }


      const subtitle = shelf?.subtitle?.runs;

      if (subtitle?.[0].text === 'Song') {
        const id = shelf?.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
        const title = shelf?.title?.runs?.[0]?.text;
        const author = subtitle?.[2]?.text;
        const duration = subtitle?.[4]?.text;
        const channelId = shelf?.menu?.menuRenderer?.items?.[6]?.menuNavigationItemRenderer?.navigationEndpoint?.browseEndpoint?.browseId;

        if (channelId)
          return {
            id,
            title,
            author: author + ' - Topic',
            duration,
            authorId: channelId
          };
      }

    }


    return {};

  } catch (error) {
    console.error('Error fetching YouTube Music search results:', error);
    return {};
  }
}
