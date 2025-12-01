import { convertSStoHHMMSS } from "../utils/helpers";
import subfeedGenerator from "../modules/subfeedGenerator";
import { getTracksMap, getThumbIdFromLink, getCollection } from "../utils";

type Hub = {
  discovery?: (CollectionItem & { frequency: number })[];
  userArtists: Channel[];
  relatedPlaylists: Playlist[];
  relatedArtists: Channel[];
  subfeed: CollectionItem[];
};

type FullArtistResponse = {
  artistName: string;
  thumbnail: string;
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
  albums: {
    title: string;
    browseId: string;
    thumbnail: string;
  }[];
};


const initialHub: Hub = {
  discovery: [],
  userArtists: [],
  relatedPlaylists: [],
  relatedArtists: [],
  subfeed: [],
};

export function getHub(): Hub {
  const hubData = localStorage.getItem('hub');
  return hubData ? JSON.parse(hubData) : initialHub;
}

export function updateHub(data: Hub) {
  localStorage.setItem('hub', JSON.stringify(data));
}

export function getHubSection<K extends keyof Hub>(sectionName: K): Hub[K] {
  const hub = getHub();
  return hub[sectionName];
}

export function updateHubSection<K extends keyof Hub>(sectionName: K, data: Hub[K]): void {
  const hub = getHub();
  hub[sectionName] = data;
  updateHub(hub);
}


export async function updateSubfeed(preview?: string): Promise<void> {
  return subfeedGenerator(preview).then((items: CollectionItem[]) => {
    const subfeed: CollectionItem[] = items.map((item: CollectionItem) => ({
      ...item,
      duration: convertSStoHHMMSS(item.duration as unknown as number),
    }));
    updateHubSection('subfeed', subfeed);
  });
}

export async function updateGallery(): Promise<void> {
  const tracksMap = getTracksMap();
  const tracks = getCollection('favorites')
    .map(id => tracksMap[id])
    .filter(Boolean);
  const artistCounts: { [key: string]: number } = {};

  tracks
    .filter(track => track.author?.endsWith(' - Topic'))
    .forEach(track => {
      if (track.authorId) {
        artistCounts[track.authorId] = (artistCounts[track.authorId] || 0) + 1;
      }
    });

  const sortedArtists = Object.entries(artistCounts)
    .filter(a => a[1] > 1)
    .sort(([, a], [, b]) => b - a)

  const artistIds = sortedArtists.map(([id]) => id);


  if (artistIds.length < 2) {
    updateHubSection('relatedArtists', []);
    updateHubSection('relatedPlaylists', []);
    updateHubSection('userArtists', []);
    return;
  }

  const results: FullArtistResponse[] = await fetch(`${Backend}/api/artists?id=${artistIds.join(',')}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .catch(error => {
      console.error('Error fetching multiple artists:', error);
      return [];
    });


  const recommendedArtistMap: {
    [index: string]: Channel & { count?: number }
  } = {};
  const relatedPlaylistMap: {
    [index: string]: Playlist & { count?: number }
  } = {};

  for (const result of results) {

    if (result?.recommendedArtists) {
      result.recommendedArtists.forEach((artist) => {

        if (artist.browseId && artist.name && artist.thumbnail) {
          const key = artist.browseId;
          if (!artistIds.includes(key)) // Only add if not already a "user artist"
            key in recommendedArtistMap ?
              recommendedArtistMap[key].count!++ :
              recommendedArtistMap[key] = {
                id: artist.browseId,
                name: artist.name,
                thumbnail: artist.thumbnail,
                count: 1
              };
        }

      });
    }

    if (result?.featuredOnPlaylists) {
      result.featuredOnPlaylists.forEach((playlist) => {
        if (playlist.browseId && playlist.title && playlist.thumbnail) {
          const key = playlist.browseId;

          key in relatedPlaylistMap ?
            relatedPlaylistMap[key].count!++ :
            relatedPlaylistMap[key] = {
              id: playlist.browseId.startsWith('VL') ? playlist.browseId.substring(2) : playlist.browseId,
              name: playlist.title,
              thumbnail: playlist.thumbnail,
              uploader: result.artistName,
              count: 1
            };
        }
      });
    }

  }


  const featuredPlaylists = Object
    .values(relatedPlaylistMap)
    .filter(s => s.count && s.count > 1)
    .sort((a, b) => b.count! - a.count!)
    .map(s => {
      delete s.count;
      return s;
    });

  const relatedArtists = Object
    .values(recommendedArtistMap)
    .filter(s => s.count && s.count > 1)
    .sort((a, b) => b.count! - a.count!)
    .map(s => {
      delete s.count;
      return s;
    });

  const userArtists = results.map(result => ({
    id: artistIds[results.indexOf(result)],
    name: result.artistName,
    thumbnail: getThumbIdFromLink(result.thumbnail),
  })).filter(artist => artist.id && artist.name && artist.thumbnail) as Channel[];


  updateHubSection('relatedArtists', relatedArtists);
  updateHubSection('relatedPlaylists', featuredPlaylists);
  updateHubSection('userArtists', userArtists);
}
