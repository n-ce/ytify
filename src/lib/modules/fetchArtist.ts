
export type ArtistResponse = {
  artistName: string;
  playlistId: string;
  recommendedArtists: {
    name: string;
    browseId: string;
    thumbnail: string;
  }[];
  featuredOnPlaylists: {
    title: string;
    browseId: string;
    thumbnail: string;
  }[];
};



export default async function(id: string): Promise<ArtistResponse> {

  return fetch('https://js-ruddy-rho.vercel.app/api/artist/' + id)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
}
