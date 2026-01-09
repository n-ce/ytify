import { getTracksMap, getThumbIdFromLink, getCollection, setDrawer, getLists } from "../utils";
import { store } from "@lib/stores";

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

// Migration: Move 'hub' from localStorage to 'drawer'
const hubData = localStorage.getItem('hub');
if (hubData) {
  try {
    const parsed = JSON.parse(hubData);
    if (parsed.discovery) setDrawer('discovery', parsed.discovery);
    if (parsed.userArtists) setDrawer('userArtists', parsed.userArtists);
    if (parsed.relatedPlaylists) setDrawer('relatedPlaylists', parsed.relatedPlaylists);
    if (parsed.relatedArtists) setDrawer('relatedArtists', parsed.relatedArtists);
    if (parsed.subfeed) setDrawer('subfeed', parsed.subfeed);
    localStorage.removeItem('hub');
  } catch (e) {
    console.error("Hub to Drawer Migration failed", e);
  }
}

export async function updateSubfeed(): Promise<void> {
  const channels = getLists('channels');
  if (!channels || channels.length === 0) {
    setDrawer('subfeed', []);
    return;
  }
  const channelIds = channels.map(channel => channel.id).join(',');
  return fetch(`${store.api}/api/subfeed?ids=${channelIds}`)
    .then(res => res.json())
    .then((subfeed: CollectionItem[]) => {
      setDrawer('subfeed', subfeed);
    })
    .catch(console.error);
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
    setDrawer('relatedArtists', []);
    setDrawer('relatedPlaylists', []);
    setDrawer('userArtists', []);
    return;
  }

  const results: FullArtistResponse[] = await fetch(`${store.api}/api/artists?id=${artistIds.join(',')}`)
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


  setDrawer('relatedArtists', relatedArtists);
  setDrawer('relatedPlaylists', featuredPlaylists);
  setDrawer('userArtists', userArtists);
}
