
export const uma = () => fetch('https://raw.githubusercontent.com/n-ce/Uma/main/list.json')
  .then(res => res.json());



export const fetchSearchSuggestions = async (
  api: string,
  text: string,
  signal: AbortSignal
): Promise<string[]> => {
  const res = await fetch(api + '/opensearch/suggestions/?query=' + text, { signal });
  if (!res.ok)
    throw new Error(`Network response was not ok: ${res.statusText}`);

  const data = await res.json();
  if (!data?.[1]?.length) {
    throw new Error('No Suggestions Received');
  }
  return data;
};

export const fetchSearchResultsPiped = async (
  api: string,
  query: string,
  filter: string
): Promise<{ items: StreamItem[], nextpage: string }> => {
  const res = await fetch(api + '/search?q=' + query + '&filter=' + filter);

  if (!res.ok)
    throw new Error(`Network response was not ok: ${res.statusText}`);

  const data = await res.json();
  if (!data?.items?.length) {
    throw new Error("No Items Found");
  }
  return data;
};


export const fetchMoreSearchResultsPiped = async (
  api: string,
  token: string,
  query: string,
  filter: string
) => {
  const res = await fetch(`${api}/nextpage/search?nextpage=${encodeURIComponent(token)}&q=${query}&filter=${filter}`);

  if (!res.ok)
    throw new Error(`Network response was not ok: ${res.statusText}`);

  const data = await res.json();
  return data;
}

export const fetchSearchResultsInvidious = async (
  api: string,
  q: string,
  sortBy: string,
  p: number
): Promise<StreamItem[]> => {
  const res = await fetch(`${api}/api/v1/search?q=${q}&sort=${sortBy}&page=${p}`);

  if (!res.ok)
    throw new Error(`Network response was not ok: ${res.statusText}`);

  const data = await res.json();
  if (!data?.length) {
    throw new Error("No Items Found");
  }
  return data;
};



export const fetchList = async (
  api: string,
  url: string
) => {

  const res = await fetch(api + url);

  if (!res.ok)
    throw new Error(`Network response was not ok: ${res.statusText}`);

  const data = await res.json();

  if ('error' in data) throw data;
  else return data;
}

export const fetchPlaylistIdFromArtistId = async (
  api: string,
  id: string
) => {
  const res = await fetch(api + id);

  if (!res.ok)
    throw new Error(`Network response was not ok: ${res.statusText}`);

  const data = await res.json();
  if (!('playlistId' in data))
    throw new Error('No Playlist Id found.');
  return data;
}
