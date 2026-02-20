import { convertSStoHHMMSS } from "../utils";

interface PipedStream {
  url: string;
  type: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderAvatar: string | null;
  uploadedDate: string | null;
  shortDescription: string | null;
  duration: number;
  views: number;
  uploaded: number;
  uploaderVerified: boolean;
  isShort: boolean;
}

interface PipedMix {
  name: string;
  thumbnailUrl: string;
  description: string;
  bannerUrl: string | null;
  nextpage: string;
  uploader: string;
  uploaderUrl: string | null;
  uploaderAvatar: string | null;
  videos: number;
  relatedStreams: PipedStream[];
}

export default function(id: string): Promise<TrackItem[]> {
  return fetch(`https://api.piped.private.coffee/playlists/RD${id}`)
    .then(res => {
      if (!res.ok) throw new Error('Fetch failed');
      return res.json() as Promise<PipedMix>;
    })
    .then(data => {
      return (data.relatedStreams || []).map(v => ({
        id: v.url.split('=')[1],
        title: v.title,
        authorId: v.uploaderUrl?.split('/').pop() || '',
        author: v.uploaderName,
        duration: convertSStoHHMMSS(v.duration)
      }) as TrackItem);
    });
}
