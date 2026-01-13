const YOUTUBE_MUSIC_SUGGESTIONS_URL = 'https://music.youtube.com/youtubei/v1/music/get_search_suggestions';

export async function getYouTubeMusicSuggestions(query: string): Promise<string[]> {
  const requestBody = {
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20250929.03.00',
        gl: 'US',
        hl: 'en'
      }
    },
    input: query
  };

  try {
    const response = await fetch(YOUTUBE_MUSIC_SUGGESTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Extract suggestions
    const contents = data.contents?.[0]?.searchSuggestionsSectionRenderer?.contents;
    
    if (!contents) return [];
    
    const suggestions: string[] = [];
    
    for (const item of contents) {
        const text = item.searchSuggestionRenderer?.navigationEndpoint?.searchEndpoint?.query;
        if (text) {
            suggestions.push(text);
        }
    }
    
    return suggestions;

  } catch (error) {
    console.error('Error in getYouTubeMusicSuggestions:', error);
    return [];
  }
}
