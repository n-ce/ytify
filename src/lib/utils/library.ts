import { navStore, setNavStore, setStore, t, updateParam, store } from '@lib/stores';
import { listStore, setListStore } from '@lib/stores';
import { config } from '@lib/utils/config';


// New Library V2 utils

export const getMeta = (): Meta => {
  const meta = localStorage.getItem('library_meta');
  if (meta) {
    return JSON.parse(meta);
  }

  const newMeta: Meta = { version: 4, tracks: 0 };
  const timestamp = Date.now();

  const tracks = getTracksMap();
  if (Object.keys(tracks).length > 0) {
    newMeta.tracks = timestamp;
  }

  const collections = getCollectionsKeys();
  for (const key of collections) {
    newMeta[key] = timestamp;
  }

  const channels = getLists('channels');
  if (channels.length > 0) {
    newMeta.channels = timestamp;
  }

  const playlists = getLists('playlists');
  if (playlists.length > 0) {
    newMeta.playlists = timestamp;
  }

  const albums = getLibraryAlbums();
  if (Object.keys(albums).length > 0) {
    newMeta.albums = timestamp;
  }

  return newMeta;
};


export const getCollectionsKeys = () => {
  const allKeys = Object
    .keys(localStorage)
    .filter(key => key.startsWith('library_'))
    .map(key => key.slice(8))
    .filter(key => !['channels', 'playlists', 'tracks', 'meta', 'albums']
      .includes(key));

  const reservedOrder = ['history', 'favorites', 'liked', 'listenLater'];
  const meta = JSON.parse(localStorage.getItem('library_meta') || '{}');

  return [
    ...reservedOrder.filter(key => allKeys.includes(key)),
    ...allKeys.filter(key => !reservedOrder.includes(key)).sort((a, b) => (meta[a] || 0) - (meta[b] || 0))
  ];
};

export const getTracksMap = (): Collection =>
  JSON.parse(localStorage.getItem('library_tracks') || '{}');

export const getCollection = (name: string) => JSON.parse(localStorage.getItem('library_' + name) || '[]') as string[];

export const getLists = <T extends 'channels' | 'playlists'>(type: T): T extends 'channels' ? Channel[] : Playlist[] => JSON.parse(localStorage.getItem('library_' + type) || '[]');

export const getLibraryAlbums = (): LibraryAlbums => JSON.parse(localStorage.getItem('library_albums') || '{}');

export function getCollectionItems(collectionId: string): CollectionItem[] {
  const collectionIds = getCollection(collectionId);
  const tracksMap = getTracksMap();
  return collectionIds.map((id: string) => tracksMap[id]).filter(Boolean) as CollectionItem[];
}

export function saveTracksMap(tracks: Collection) {
  localStorage.setItem('library_tracks', JSON.stringify(tracks))
};

export function saveCollection(
  name: string,
  collection: string[]
) {
  localStorage.setItem('library_' + name, JSON.stringify(collection));
}

export function saveLists<T extends 'channels' | 'playlists'>(type: T, data: T extends 'channels' ? Channel[] : Playlist[]) {
  localStorage.setItem(`library_${type}`, JSON.stringify(data));
};

export function saveLibraryAlbums(albums: LibraryAlbums) {
  localStorage.setItem('library_albums', JSON.stringify(albums));
}

export function saveAlbumToLibrary(albumId: string, albumData: Album, tracksData: CollectionItem[]) {
  const albums = getLibraryAlbums();
  albums[albumId] = albumData;
  saveLibraryAlbums(albums);

  const tracks = getTracksMap();
  for (const track of tracksData) {
    if (tracks[track.id]) {
      tracks[track.id].albumId = albumId;
    } else {
      tracks[track.id] = { ...track, albumId: albumId };
    }
  }
  saveTracksMap(tracks);
  metaUpdater('albums');
}

export function removeAlbumFromLibrary(albumId: string) {
  const albums = getLibraryAlbums();
  const tracksToRemove = albums[albumId]?.tracks || [];
  delete albums[albumId];
  saveLibraryAlbums(albums);

  const tracks = getTracksMap();
  const allOtherTrackIds = new Set([
    ...getCollectionsKeys().flatMap(getCollection),
    ...Object.values(albums).flatMap(a => a.tracks)
  ]);

  for (const trackId of tracksToRemove) {
    if (!allOtherTrackIds.has(trackId)) {
      delete tracks[trackId];
    } else {
      const track = tracks[trackId];
      if (track?.albumId === albumId) {
        delete track.albumId;
      }
    }
  }

  saveTracksMap(tracks);
  metaUpdater('albums');
}


export function addToCollection(
  name: string,
  data: CollectionItem[]
) {
  const collection = getCollection(name);
  const tracks = getTracksMap();
  const prepend = ['history', 'favorites'].includes(name);

  for (const item of data) {
    if (!item?.id) continue;
    const { id } = item;
    const idx = collection.indexOf(id);

    if (idx !== -1)
      collection.splice(idx, 1);

    if (prepend)
      collection.unshift(id);
    else collection.push(id);

    if (id in tracks) {
      const track = tracks[id];
      track.plays = (track.plays || 1) + 1;
      if (config.dbsync) {
        import('@lib/modules/cloudSync').then(({ addDirtyTrack }) => {
          addDirtyTrack(id); // Mark as updated
        });
      }
    } else {
      tracks[id] = item;
      if (config.dbsync) {
        import('@lib/modules/cloudSync').then(({ addDirtyTrack }) => {
          addDirtyTrack(id); // Mark as added
        });
      }
    }
  }

  saveCollection(name, collection);
  saveTracksMap(tracks);
  metaUpdater(name);
}

export function removeFromCollection(
  name: string,
  ids: string[]
) {
  const collection = getCollection(name);
  const collections = getCollectionsKeys().filter(k => k !== name);;
  const tracks = getTracksMap();

  for (const id of ids) {
    const idx = collection.indexOf(id);
    if (idx !== -1)
      collection.splice(idx, 1);

    let isReferenced = false;
    for (const key of collections)
      if (getCollection(key).includes(id)) {
        isReferenced = true;
        break;
      }

    if (!isReferenced) {
      delete tracks[id];
      if (config.dbsync) {
        import('@lib/modules/cloudSync').then(({ removeDirtyTrack }) => {
          removeDirtyTrack(id); // Mark as deleted
        });
      }
    }
  }

  saveCollection(name, collection);
  saveTracksMap(tracks);
  metaUpdater(name);


  if (listStore.type === 'collection')
    setListStore('list', l => l.filter(item => !ids.includes(item.id)));

}

export function deleteCollection(name: string) {
  const ids = getCollection(name);
  const collections = getCollectionsKeys().filter(k => k !== name);;
  const tracks = getTracksMap();

  for (const id of ids) {
    let isReferenced = false;
    for (const key of collections)
      if (getCollection(key).includes(id)) {
        isReferenced = true;
        break;
      }

    if (!isReferenced) {
      delete tracks[id];
      if (config.dbsync) {
        import('@lib/modules/cloudSync').then(({ removeDirtyTrack }) => {
          removeDirtyTrack(id); // Mark as deleted
        });
      }
    }
  }

  localStorage.removeItem('library_' + name);
  saveTracksMap(tracks);
  metaUpdater(name, true);
}


export const metaUpdater = (key: string, remove?: boolean) => {
  const meta = getMeta();
  const timestamp = Date.now();

  // should auto-update tracks on collection changes
  if (getCollectionsKeys().includes(key) || key === 'albums')
    meta.tracks = timestamp;

  if (remove)
    delete meta[key];
  else
    meta[key] = timestamp;

  localStorage.setItem('library_meta', JSON.stringify(meta));
  if (store.syncState !== 'syncing') {
    setStore('syncState', 'dirty');
    if (config.dbsync) {
      import('@lib/modules/cloudSync').then(({ scheduleSync }) => {
        scheduleSync();
      });
    }
  }
}



export function createCollection(title: string) {
  const exists = getCollectionsKeys().includes(title);
  if (exists) {
    setStore('snackbar', t('list_already_exists'));
    return;
  }

  metaUpdater(title);
}

export function renameCollection(oldName: string, newName: string) {
  if (oldName === newName) return;

  const collections = getCollectionsKeys();
  if (collections.includes(newName)) {
    setStore('snackbar', t('list_already_exists'));
    return;
  }

  const collectionItems = getCollection(oldName);
  saveCollection(newName, collectionItems);
  localStorage.removeItem('library_' + oldName);
  metaUpdater(oldName, true);
  metaUpdater(newName);
}


export async function fetchCollection(
  id: string | null,
  shared: boolean = false
) {
  if (!id) return;

  const { state, ref } = navStore.list;
  if (state)
    ref?.scrollIntoView();
  else
    setNavStore('list', 'state', true);

  setListStore('isLoading', true);

  const display = shared ? 'Shared Collection' : id;
  const { reservedCollections } = listStore;
  const isReserved = reservedCollections.includes(id);

  setListStore({
    name: decodeURIComponent(display),
    isReversed: isReserved,
    isShared: shared
  });

  if (shared) {
    await getSharedCollection(id);
    updateParam('si', id);
  }
  else {
    getLocalCollection(id);
    updateParam('collection', id);
  }

  setNavStore('list', 'state', true);
  setListStore('isLoading', false);

  document.title = display + ' - ytify';

}

function setObserver(callback: () => number) {
  const ref = document.querySelector(`.listContainer > :last-child`) as HTMLElement;
  if (!ref) return;
  const obs = new IntersectionObserver((entries, observer) =>
    entries.forEach(e => {
      if (e.isIntersecting) {
        observer.disconnect();
        const itemsLeft = callback();
        if (itemsLeft)
          setObserver(callback);

      }
    }));
  obs.observe(ref);
  setListStore('observer', obs);
}


function getLocalCollection(
  collection: string,
) {

  let ids = getCollection(decodeURI(collection));
  if (ids.length === 0) {
    setStore('snackbar', 'No items found');
    setListStore({ list: [], length: 0, name: collection });
    return;
  }

  const tracks = getTracksMap();

  let sortedIds = ids;
  if (config.sortOrder !== 'modified') {
    const items = ids.map(id => tracks[id]);
    const sortedItems = sortCollection(items, config.sortOrder);
    sortedIds = sortedItems.map(item => item.id);
  }

  const usePagination = sortedIds.length > 10;

  setListStore({
    name: collection,
    length: sortedIds.length
  });

  if (usePagination) {
    let loadedCount = 20;
    setListStore('list', sortedIds.slice(0, loadedCount).map(id => tracks[id]));

    const observerCallback = () => {
      if (loadedCount >= sortedIds.length) return 0;

      const nextBatch = sortedIds.slice(loadedCount, loadedCount + 20);
      loadedCount += 20;

      setListStore('list', (l) => [...l, ...nextBatch.map(id => tracks[id])]);
      return sortedIds.length - loadedCount;
    };

    setTimeout(() => setObserver(observerCallback), 100);

  } else {
    setListStore('list', sortedIds.map(id => tracks[id]));
  }

  setListStore('id', decodeURI(collection));
}

async function getSharedCollection(
  id: string
) {

  setListStore('isLoading', true);
  const data = await fetch(`${location.origin}/blob/${id}`)
    .then(res => res.json())
    .catch(() => '');
  if (data)
    setListStore('list', data);
  else
    setStore('snackbar', `Collection does not exist`);

  setListStore('isLoading', false);
}

export type SortOrder = 'modified' | 'name' | 'artist' | 'duration';

export function sortCollection(list: CollectionItem[], sortOrder: SortOrder): CollectionItem[] {
  if (sortOrder === 'modified') {
    return list;
  }

  const listToSort = [...list];

  listToSort.sort((a, b) => {
    switch (sortOrder) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'artist':
        return (a.author || '').localeCompare(b.author || '');
      case 'duration':
        const parseDuration = (d: string) => {
          const parts = d.split(':').map(Number);
          if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
          if (parts.length === 2) return parts[0] * 60 + parts[1];
          return 0;
        };
        return parseDuration(a.duration) - parseDuration(b.duration);
      default:
        return 0;
    }
  });

  return listToSort;
}

export function cleanseLibraryData() {

  // 1. Cleanse library_tracks
  const rawTracks = JSON.parse(localStorage.getItem('library_tracks') || '{}') as Collection;
  const cleanedTracks: Collection = {};
  let tracksCleaned = false;
  for (const id in rawTracks) {
    if (id) {
      cleanedTracks[id] = rawTracks[id];
    } else {
      tracksCleaned = true;
    }
  }
  if (tracksCleaned)
    saveTracksMap(cleanedTracks);

  // 2. Cleanse all other collections
  const collectionKeys = getCollectionsKeys();
  for (const key of collectionKeys) {
    const collection = JSON.parse(localStorage.getItem('library_' + key) || '[]') as string[];
    const validCollection = collection.filter(id => id);
    if (validCollection.length < collection.length) {
      console.log(`Found and removed ${collection.length - validCollection.length} invalid entries from '${key}' collection.`);
      saveCollection(key, validCollection);
    }
  }
}
