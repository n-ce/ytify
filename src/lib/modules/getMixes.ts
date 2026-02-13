import { store, setStore } from "../stores";
import { convertSStoHHMMSS } from "../utils";

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

const fetchMix = (
  mixId: string,
  index = store.index
): Promise<TrackItem[]> => {
  const api = store.invidious[index] || '';
  if (!api) return Promise.reject('No Invidious API available');

  return fetch(`${api}/api/v1/mixes/${mixId}`)
    .then(res => {
      if (!res.ok) throw new Error('Fetch failed');
      return res.json() as Promise<Mix>;
    })
    .then(data => {
      setStore('index', index);
      return data.videos.map(v => ({
        id: v.videoId,
        title: v.title,
        authorId: v.authorId,
        author: v.author,
        duration: convertSStoHHMMSS(v.lengthSeconds)
      }) as TrackItem);
    })
    .catch(e => {
      if (index + 1 < store.invidious.length) {
        return fetchMix(mixId, index + 1);
      }
      throw e;
    });
};

export default async function(ids: string[]): Promise<TrackItem[]> {
  if (ids.length === 1 && ids[0].length === 11) {
    return fetchMix('RD' + ids[0]);
  }

  const promises = ids.map(seedId =>
    fetchMix('RD' + seedId)
      .catch(() => [] as TrackItem[])
  );

  const data = await Promise.all(promises);
  const map: Record<string, TrackItem & { count: number }> = {};

  data.flat().forEach(obj => {
    const key = obj.id;
    if (!ids.includes(key)) {
      if (map[key]) {
        map[key].count++;
      } else {
        map[key] = { ...obj, count: 1 };
      }
    }
  });

  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .map(({ count, ...rest }) => rest as TrackItem);
}
