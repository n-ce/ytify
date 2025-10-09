import { config } from '@lib/utils';

export interface SearchSuggestion {
  source: string;
  suggestions: string[];
}

const fetchJson = <T>(url: string, signal?: AbortSignal): Promise<T> => {
  return fetch(url, { signal })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Network response was not ok: ${res.statusText}`);
      }
      return res.json() as Promise<T>;
    });
}

export const fetchSearchSuggestions = (
  text: string,
  signal: AbortSignal
): Promise<string[]> => {
  const isMusic = config.searchFilter.startsWith('music_');
  let url = `https://ytm-jgmk.onrender.com/api/search/suggestions?q=${encodeURIComponent(text)}`;
  if (isMusic) {
    url += '&music=1';
  }
  return fetchJson<SearchSuggestion>(url, signal)
    .then(data => {
      return data.suggestions;
    });
};
