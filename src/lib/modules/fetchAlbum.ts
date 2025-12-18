import { store } from "@lib/stores";
import { fetchJson } from "@lib/utils";

export interface AlbumResponse {
  id: string;
  playlistId: string;
  title: string;
  author: string;
  authorId?: string;
  year: string;
  thumbnail: string;
  tracks: {
    id: string;
    title: string;
    author: string;
    authorId?: string;
    duration: string;
    thumbnail: string;
    videoId: string;
  }[];
}

export default async function fetchAlbum(albumId: string): Promise<AlbumResponse> {
  return fetchJson<AlbumResponse>(`${store.api}/api/album?id=${albumId}`);
}