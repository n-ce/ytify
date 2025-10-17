import { convertSStoHHMMSS, fetchJson } from '@lib/utils';

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

export default async function(
  mixId: string,
  api: string
): Promise<CollectionItem[]> {
  return fetchJson<Mix>(`${api}/api/v1/mixes/${mixId}`)
    .then(data => data.videos.map(v => ({
      id: v.videoId,
      title: v.title,
      authorId: v.authorId,
      author: v.author,
      duration: convertSStoHHMMSS(v.lengthSeconds)
    }) as CollectionItem));
};
