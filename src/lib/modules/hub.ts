
import { convertSStoHHMMSS } from "../utils/helpers";
import subfeedGenerator from "../modules/subfeedGenerator";
import { getDB } from "../utils";

type Hublist = List & {
  frequency?: number;
}

type Hub = {
  discovery: { [index: string]: CollectionItem & { frequency: number } };
  playlists: { [index: string]: Hublist & { uploader: string } };
  artists: { [index: string]: Hublist };
  foryou: { [index: string]: CollectionItem & { frequency: number } };
  subfeed: { [index: string]: CollectionItem };
};

const HUB_STORAGE_KEY = 'hub';

const initialHub: Hub = {
  discovery: {},
  playlists: {},
  artists: {},
  foryou: {},
  subfeed: {},
};

export function getHub(): Hub {
  const hubData = localStorage.getItem(HUB_STORAGE_KEY);
  return hubData ? JSON.parse(hubData) : initialHub;
}

export function updateHub(data: Hub): void {
  localStorage.setItem(HUB_STORAGE_KEY, JSON.stringify(data));
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



export async function updateSubfeed(): Promise<void> {
  const { channels } = getDB();
  const channelIds = channels ? Object.keys(channels) : [];
  return subfeedGenerator(channelIds).then((items) => {
    const subfeed: { [index: string]: CollectionItem } = {};
    items.forEach((item) => {
      const videoId = item.url.slice(-11);
      subfeed[videoId] = {
        id: videoId,
        title: item.title,
        author: item.uploaderName,
        duration: convertSStoHHMMSS(item.duration),
        channelUrl: item.uploaderUrl,
      };
    });
    updateHubSection('subfeed', subfeed);
  });
}

type ArtistEdgeResponse = {
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

export async function updateRelatedToYourArtists(): Promise<void> {
  const { channels } = getDB();
  const artistIds = channels ? Object.keys(channels).filter(id => channels[id].name.includes('Artist - ')) : [];

  const promises = artistIds.map(id => fetch(`/artist/${id}`).then(res => res.json() as Promise<ArtistEdgeResponse>));

  return Promise.all(promises).then(results => {
    const relatedArtists: { [index: string]: Hublist } = {};
    const featuredPlaylists: { [index: string]: Hublist & { uploader: string } } = {};

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
