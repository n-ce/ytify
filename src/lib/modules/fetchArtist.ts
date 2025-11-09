
export type ArtistResponse = {
  artistName: string;
  playlistId: string;
  albums: {
    title: string;
    browseId: string;
    thumbnail: string;
  }[];
};



export default async function(id: string): Promise<ArtistResponse> {

  return fetch(`${Backend}/api/artists?id=${id}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
}
