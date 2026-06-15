import { convertSStoHHMMSS, shuffle } from '@utils';

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

const instances = shuffle([
  "yt.omada.cafe",
  "iv.melmac.space",
  "invidious.materialio.us",
  "invidious.schenkel.eti.br",
  "invidious.kemonomimi.nl",
  "inv.thepixora.com",
  "invidious.darkness.services"
]);

export default async function(id: string): Promise<TrackItem[]> {
  for (const instance of instances) {
    try {
      const res = await fetch(`https://${instance}/api/v1/mixes/RD${id}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json() as InvidiousMix;
      
      return (data.videos || []).map(v => ({
        id: v.videoId,
        title: v.title,
        authorId: v.authorId,
        author: v.author,
        duration: convertSStoHHMMSS(v.lengthSeconds)
      }) as TrackItem);
    } catch (e) {
      console.warn(`Instance ${instance} failed, trying next...`);
    }
  }

  throw new Error('All instances failed to generate radio');
}
