import { config, fetchJson, getApi } from '@lib/utils';
import { store } from '@lib/stores';

export default async function fetchSearchSuggestions(
  text: string,
  signal: AbortSignal,
  index: number = store.invidious.length - 1
): Promise<string[]> {
  const isMusic = config.searchFilter.startsWith('music_');

  if (isMusic) {
    const url = `${store.api}/api/suggestions?q=${encodeURIComponent(text)}`;
    return fetchJson<{ suggestions: string[] }>(url, signal)
      .then(data => data.suggestions);
  } else {
    const api = getApi(index);
    const url = `${api}/api/v1/search/suggestions?q=${encodeURIComponent(text)}`;
    
    return fetchJson<{ suggestions: string[] }>(url, signal)
      .then(data => data.suggestions)
      .catch(e => {
        if (index <= 0) throw e;
        return fetchSearchSuggestions(text, signal, index - 1);
      });
  }
};
