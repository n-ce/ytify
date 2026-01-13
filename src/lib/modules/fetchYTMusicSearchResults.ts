import { config, fetchJson } from '@lib/utils';
import { store } from '@lib/stores';

const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

interface SearchResponse {
  results: (YTStreamItem | YTListItem)[];
}

export default async function(
  query: string,
): Promise<(YTStreamItem | YTListItem)[]> {
  const filter = config.searchFilter.substring(6); // remove "music_"
  const url = `${store.api}/api/search?q=${encodeURIComponent(normalizeString(query))}&filter=${filter}`;

  return fetchJson<SearchResponse>(url).then(data => data.results);
};
