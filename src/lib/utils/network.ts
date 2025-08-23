// src/lib/utils/network.ts

// Helper function for consistent error handling
async function handleResponse(res: Response): Promise<any> {
  if (!res.ok) {
    throw new Error(`Network response was not ok: ${res.statusText}`);
  }
  const data = await res.json();
  return data;
}

// SEARCH

export const fetchSearchSuggestions = async (api: string, text: string, signal: AbortSignal): Promise<string[]> => {
  const data = await handleResponse(await fetch(api + '/opensearch/suggestions/?query=' + text, { signal }));
  if (!data?.[1]?.length) {
    throw new Error('No Suggestions Received');
  }
  return data;
};

export const fetchSearchResultsPiped = async (api: string, query: string, filter: string): Promise<{ items: StreamItem[], nextpage: string }> => {
  const searchResults = await handleResponse(await fetch(api + '/search?q=' + query + '&filter=' + filter));
  if (!searchResults?.items?.length) {
    throw new Error("No Items Found");
  }
  return searchResults;
};

export const fetchSearchResultsInvidious = async (
  api: string,
  q: string,
  sortBy: string,
  p: number
): Promise<StreamItem[]> => {
  const items = await handleResponse(await fetch(`${api}/api/v1/search?q=${q}&sort=${sortBy}&page=${p}`));
  if (!items?.length) {
    throw new Error("No Items Found");
  }
  return items;
};
