import { convertSStoHHMMSS, fetchJson, getApi } from '@lib/utils';
import { store } from '@lib/stores';

interface MixVideo {
  title: string;
  videoId: string;
  author: string;
  authorId: string;
  authorUrl: string;
  videoThumbnails: {
    quality: string;
    url: string;
    width: number;
    height: number;
  }[];
  index: number;
  lengthSeconds: number;
}

export interface Mix {
  title: string;
  mixId: string;
  videos: MixVideo[];
}

export default async function fetchMix(
  mixId: string,
  index: number = store.invidious.length - 1
): Promise<CollectionItem[]> {
  const api = getApi(index);
  return fetchJson<Mix>(`${api}/api/v1/mixes/${mixId}`)
    .then(data => data.videos.map(v => ({
      id: v.videoId,
      title: v.title,
      authorId: v.authorId,
      author: v.author,
      duration: convertSStoHHMMSS(v.lengthSeconds)
    }) as CollectionItem))
    .catch(e => {
      if (index <= 0) throw e;
      return fetchMix(mixId, index - 1);
    });
};