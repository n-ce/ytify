import { store } from "@lib/stores";

export type ArtistResponse = {
  artistName: string;
  playlistId: string;
  albums: {
    id?: string;
    title: string;
    subtitle: string;
    thumbnail: string;
  }[];
};



export default async function(id: string): Promise<ArtistResponse> {

  return fetch(`${store.api}/api/artists?id=${id}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
}
