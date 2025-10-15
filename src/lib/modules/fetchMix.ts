
import { store } from '@lib/stores/app';
import { convertSStoHHMMSS } from '@lib/utils';

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

export default async function(mixId: string): Promise<CollectionItem[]> {
  const invidiousInstance = store.invidious[store.invidious.length - 1];
  return fetch(`${invidiousInstance}/api/v1/mixes/${mixId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data: Mix) => data.videos.map(v => ({
      id: v.videoId,
      title: v.title,
      authorId: v.authorId,
      author: v.author,
      duration: convertSStoHHMMSS(v.lengthSeconds)
    }) as CollectionItem));
};
