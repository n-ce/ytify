import { config, fetchJson } from '@lib/utils';

export interface SearchSuggestion {
  source: string;
  suggestions: string[];
}


export default async function(
  text: string,
  signal: AbortSignal
): Promise<string[]> {
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
