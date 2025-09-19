// 1. Define Specific Response Types

export interface PipedSuggestion {
  query: string;
  suggestions: string[];
}

export interface PipedStream {
  url: string;
  type: 'stream';
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  uploadedDate: string;
  shortDescription: string;
  duration: number;
  views: number;
  uploaded: number;
  uploaderVerified: boolean;
  isShort: boolean;
}

export interface PipedChannel {
  url: string;
  type: 'channel';
  name: string;
  thumbnail: string;
  description: string;
  subscribers: number;
  videos: number;
  uploaderVerified: boolean;
}

export interface PipedPlaylist {
  url: string;
  type: 'playlist';
  name: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  videoCount: number;
}

export type PipedSearchItem = PipedStream | PipedChannel | PipedPlaylist;

export interface PipedSearchResponse {
  items: PipedSearchItem[];
  nextpage: string;
  suggestion: string;
  corrected: boolean;
}

export interface InvidiousVideoThumbnail {
  quality: string;
  url: string;
  width: number;
  height: number;
}

export interface InvidiousVideo {
  type: 'video';
  title: string;
  videoId: string;
  author: string;
  authorId: string;
  authorUrl: string;
  authorVerified: boolean;
  videoThumbnails: InvidiousVideoThumbnail[];
  description: string;
  descriptionHtml: string;
  viewCount: number;
  published: number;
  publishedText: string;
  lengthSeconds: number;
  liveNow: boolean;
  premium: boolean;
  isUpcoming: boolean;
}

export interface InvidiousPlaylist {
    type: 'playlist';
    title: string;
    playlistId: string;
    author: string;
    authorId: string;
    authorUrl: string;
    videoCount: number;
}

export interface InvidiousChannel {
    type: 'channel';
    author: string;
    authorId: string;
    authorUrl: string;
    authorVerified: boolean;
    subCount: number;
}

export type InvidiousSearchItem = InvidiousVideo | InvidiousPlaylist | InvidiousChannel;

export type InvidiousSearchResponse = InvidiousSearchItem[];

export type SearchResultItem = PipedSearchItem | InvidiousSearchItem;

// 2. Fetching Logic

const fetchJson = <T>(url: string, signal?: AbortSignal): Promise<T> => {
  return fetch(url, { signal })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Network response was not ok: ${res.statusText}`);
      }
      return res.json() as Promise<T>;
    });
}

export const getSuggestions = (
  api: string,
  text: string,
  signal: AbortSignal
): Promise<string[]> => {
  const url = api + '/opensearch/suggestions/?query=' + text;
  return fetchJson<PipedSuggestion>(url, signal)
    .then(data => {
      return data.suggestions;
    });
};

export const search = (
  api: string,
  query: string,
  filter: string,
  page: number,
  nextPageToken: string | null,
  useInvidious: boolean
): Promise<{ items: SearchResultItem[], nextpage: string | null }> => {
  let url: string;
  if (useInvidious) {
    url = `${api}/api/v1/search?q=${query}&sort=${filter}&page=${page}`;
    return fetchJson<InvidiousSearchResponse>(url)
      .then(items => {
        return { items, nextpage: null };
      });
  } else {
    if (nextPageToken) {
      url = `${api}/nextpage/search?nextpage=${encodeURIComponent(nextPageToken)}&q=${query}&filter=${filter}`;
    } else {
      url = `${api}/search?q=${query}&filter=${filter}`;
    }
    return fetchJson<PipedSearchResponse>(url)
      .then(data => {
        return { items: data.items, nextpage: data.nextpage };
      });
  }
}