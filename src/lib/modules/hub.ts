
import { convertSStoHHMMSS } from "../utils/helpers";
import subfeedGenerator from "../modules/subfeedGenerator";
import { getLists } from "../utils";
import fetchArtist from "./fetchArtist";

type Hub = {
  discovery?: (CollectionItem & { frequency: number })[];
  playlists: Playlist[];
  artists: Channel[];
  subfeed: CollectionItem[];
};


const initialHub: Hub = {
  discovery: [],
  playlists: [],
  artists: [],
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

export function clearHubSection(sectionName: keyof Hub): void {
  const hub = getHub();
  const newSection = initialHub[sectionName];
  const newHub: Hub = {
    ...hub,
    [sectionName]: newSection,
  };
  updateHub(newHub);
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

export async function updateRelatedToYourArtists(): Promise<void> {
  const channels = getLists('channels');
  const artistIds = channels ? channels.filter(channel => channel.name.includes('Artist - ')).map(channel => channel.id) : [];

  const promises = artistIds.map(fetchArtist);

  return Promise.all(promises).then(results => {

    const ArtistMap: {
      [index: string]: Channel & { count?: number }
    } = {};
    const PlaylistMap: {
      [index: string]: Playlist & { count?: number }
    } = {};

    results.forEach(result => {

      if (result?.recommendedArtists) {
        result.recommendedArtists.forEach(artist => {

          const key = artist.browseId;
          if (!artistIds.includes(key))
            key in ArtistMap ?
              ArtistMap[key].count!++ :
              ArtistMap[key] = {
                id: artist.browseId,
                name: artist.name,
                thumbnail: artist.thumbnail,
                count: 1
              };

        });
      }

      if (result?.featuredOnPlaylists) {
        result.featuredOnPlaylists.forEach(playlist => {
          const key = playlist.browseId;

          key in PlaylistMap ?
            PlaylistMap[key].count!++ :
            PlaylistMap[key] = {
              id: playlist.browseId,
              name: playlist.title,
              thumbnail: playlist.thumbnail,
              uploader: result.artistName,
              count: 1
            };
        });
      }
    });


    const featuredPlaylists = Object
      .values(PlaylistMap)
      .sort((a, b) => b.count! - a.count!)
      .map(s => {
        delete s.count;
        return s;
      });

    const relatedArtists = Object
      .values(ArtistMap)
      .sort((a, b) => b.count! - a.count!)
      .map(s => {
        delete s.count;
        return s;
      });



    updateHubSection('artists', relatedArtists);
    updateHubSection('playlists', featuredPlaylists);
  });
}

