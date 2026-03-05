import { convertSStoHHMMSS } from '@utils';

interface InvidiousMix {
  title: string;
  mixId: string;
  videos: {
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
  }[];
}

export default async function(id: string): Promise<TrackItem[]> {
  return fetch(`https://inv.thepixora.com/api/v1/mixes/RD${id}`)
    .then(res => {
      if (!res.ok) throw new Error('Fetch failed, Try Again');
      return res.json() as Promise<InvidiousMix>;
    })
    .then(data => {
      return (data.videos || []).map(v => ({
        id: v.videoId,
        title: v.title,
        authorId: v.authorId,
        author: v.author,
        duration: convertSStoHHMMSS(v.lengthSeconds)
      }) as TrackItem);
    });
}
