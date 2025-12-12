import { fetchJson } from "@lib/utils";

export interface AlbumResponse {
  id: string;
  playlistId: string;
  title: string;
  artist: string;
  year: string;
  thumbnail: string;
  tracks: {
    id: string;
    title: string;
    artist: string;
    duration: string;
    thumbnail: string;
    videoId: string;
  }[];
}

export default async function fetchAlbum(albumId: string): Promise<AlbumResponse> {
  return fetchJson<AlbumResponse>(`https://ytify-backend.vercel.app/api/album/${albumId}`);
}
