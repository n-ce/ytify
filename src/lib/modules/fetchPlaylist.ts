interface Thumbnail {
  quality: string;
  url: string;
  width: number;
  height: number;
}

interface AuthorThumbnail {
  url: string;
  width: number;
  height: number;
}

interface Video {
  type: "video";
  title: string;
  videoId: string;
  author: string;
  authorId: string;
  authorUrl: string;
  videoThumbnails: Thumbnail[];
  index: number;
  lengthSeconds: number;
  liveNow: boolean;
}

export interface Playlist {
  type: "playlist";
  title: string;
  playlistId: string;
  playlistThumbnail: string | null;
  author: string;
  authorId: string;
  authorUrl: string;
  subtitle: string;
  authorThumbnails: AuthorThumbnail[];
  description: string;
  descriptionHtml: string;
  videoCount: number;
  viewCount: number;
  updated: number;
  isListed: boolean;
  videos: Video[];
}

export interface PlaylistResponse {
  thumbnail: string,
  videos: Video[],
  author: string,
  title: string
}

export default async function(
  id: string,
  api: string,
  page: number
): Promise<PlaylistResponse> {

  const isYTM = id.startsWith('VL');
  if (isYTM)
    id = id.slice(2);

  return fetch(`${api}/api/v1/playlists/${id}?page=${page}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data: Playlist) => ({
      author: data?.author,
      title: data.title,
      thumbnail: data?.authorThumbnails?.[0]?.url,
      videos: data.videos
    }));
}
