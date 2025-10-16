
import { convertSStoHHMMSS } from "../utils/helpers";
import subfeedGenerator from "../modules/subfeedGenerator";
import { getLists, getCollection } from "../utils";
import fetchArtist from "./fetchArtist";
import supermix from "./supermix";


type Hub = {
  discovery?: { [index: string]: CollectionItem & { frequency: number } };
  playlists: Playlists;
  artists: Channels;
  foryou: CollectionItem[];
  subfeed: CollectionItem[];
};


const initialHub: Hub = {
  discovery: {},
  playlists: {},
  artists: {},
  foryou: [],
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
  const artistIds = channels ? Object.keys(channels).filter(id => channels[id].name.includes('Artist - ')) : [];

  const promises = artistIds.map(fetchArtist);

  return Promise.all(promises).then(results => {
    const relatedArtists = {} as Channels;
    const featuredPlaylists = {} as Playlists;

    results.forEach(result => {
      if (!result) return;
      if (result.recommendedArtists) {
        result.recommendedArtists.forEach(artist => {
          relatedArtists[artist.browseId] = {
            id: artist.browseId,
            name: artist.name,
            thumbnail: artist.thumbnail,
          };
        });
      }
      if (result.featuredOnPlaylists) {
        result.featuredOnPlaylists.forEach(playlist => {
          featuredPlaylists[playlist.browseId] = {
            id: playlist.browseId,
            name: playlist.title,
            thumbnail: playlist.thumbnail,
            uploader: result.artistName,
          };
        });
      }
    });

    updateHubSection('artists', relatedArtists);
    updateHubSection('playlists', featuredPlaylists);
  });
}

export async function updateForYou(): Promise<void> {
  const favorites = getCollection('favorites');
  if (favorites.length === 0) return;

  const mixArray = await supermix(favorites);
  updateHubSection('foryou', mixArray);
}
