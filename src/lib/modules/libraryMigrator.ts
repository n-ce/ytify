import { getTracksMap, saveTracksMap, saveCollection, metaUpdater, drawer, setDrawer, convertSStoHHMMSS } from '@utils';
import { setStore } from '@stores';

type CollectionItemV1 = {
  id: string,
  title: string,
  author: string,
  duration: string | number
  channelUrl: string,
  lastUpdated?: string
}
type CollectionV1 = { [index: string]: CollectionItemV1 }

type Channels = { [index: string]: Channel };
type Playlists = { [index: string]: Playlist };
type LibraryV1 = {
  history?: CollectionV1,
  favorites?: CollectionV1,
  listenLater?: CollectionV1,
  channels?: Channels,
  playlists?: Playlists,
  [index: string]: CollectionV1 | Channels | Playlists | undefined
}

export default function migrateLibrary() {
  // Assumes migration is needed if this function is called
  console.log('Old V1 library found. Starting migration...');

  const report = {
    collections: 0,
    tracks: 0,
    discover: 0,
    lists: 0,
    skipped: 0,
  };

  try {
    const oldLibrary: LibraryV1 = JSON.parse(localStorage.getItem('library')!);

    const newTracks = getTracksMap(); // Initialize tracks map once

    for (const key in oldLibrary) {
      if (oldLibrary.hasOwnProperty(key)) {
        const collectionData = oldLibrary[key];

        if (key === 'discover') {
          // Integrate discover migration logic
          const discovery = [...(drawer.discovery || [])];

          for (const id in collectionData) {
            const { title, duration, channelUrl, author, frequency } = collectionData[id] as CollectionItemV1 & { frequency: number };

            if (id.length !== 11) {
              console.warn(`Skipping invalid ID in V1 discover collection: ${id}`);
              report.skipped++;
              continue;
            }
            discovery.push({ id, author, title, duration: typeof duration === 'number' ? convertSStoHHMMSS(duration) : duration, frequency, authorId: channelUrl.slice(9), type: 'video' })
            report.discover++;
          }
          setDrawer('discovery', discovery);
          console.log(`Migrated discover collection to hub.`);
        } else if (key === 'channels' || key === 'playlists') {
          const list = Object.values(collectionData as object).filter(item => {
            let isValid = false;
            if (key === 'playlists') {
              isValid = (item.id.startsWith('PL') && item.id.length === 34) || (item.id.startsWith('OLAK5uy_') && item.id.length === 41);
            } else if (key === 'channels') {
              isValid = item.id.startsWith('UC') && item.id.length === 24 && !item.name.startsWith('Artist');
            }
            if (!isValid) {
              console.warn(`Skipping invalid item in V1 ${key} collection:`, item);
              report.skipped++;
            }
            return isValid;
          });
          localStorage.setItem(`library_${key}`, JSON.stringify(list));
          metaUpdater(key);
          if (collectionData) {
            report.lists += Object.keys(collectionData).length;
          }
          console.log(`Migrated list type: ${key}`);
        } else {
          if (key === 'favorites') {
            const favoritesCollectionIds: string[] = [];
            const likedCollectionIds: string[] = [];
            for (const id in collectionData) {
              const item = collectionData[id] as CollectionItemV1;

              if (item && typeof item.id === 'string' && typeof item.title === 'string' && item.id.length === 11) {
                const newItem: TrackItem = {
                  id: item.id,
                  title: item.title,
                  author: item.author || 'Unknown',
                  duration: (typeof item.duration === 'number') ? convertSStoHHMMSS(item.duration) :
                    (!item.duration.includes(':')) ? convertSStoHHMMSS(parseInt(item.duration)) :
                      (item.duration || 'NULL'),
                  authorId: item.channelUrl?.slice(9) || '',
                };

                if (item.author && item.author.includes(' - Topic')) {
                  favoritesCollectionIds.push(id);
                } else {
                  likedCollectionIds.push(id);
                }
                newTracks[id] = newItem;
              } else {
                console.warn(`Skipping invalid CollectionItem in V1 collection '${key}' with ID '${id}':`, item);
                report.skipped++;
              }
            }
            favoritesCollectionIds.reverse();
            likedCollectionIds.reverse();
            saveCollection('favorites', favoritesCollectionIds);
            metaUpdater('favorites');
            saveCollection('liked', likedCollectionIds);
            metaUpdater('liked');
            report.collections += 2;
            report.tracks += favoritesCollectionIds.length + likedCollectionIds.length;
            console.log(`Migrated collection: favorites and liked`);
          } else {
            // Migrate other collections (history, listenLater, and custom collections)
            const newCollectionIds: string[] = [];
            for (const id in collectionData) {
              const item = collectionData[id] as CollectionItemV1;

              // Ensure item is a valid CollectionItem and omit 'lastUpdated'
              if (item && typeof item.id === 'string' && typeof item.title === 'string' && item.id.length === 11) {
                const newItem: TrackItem = {
                  id: item.id,
                  title: item.title,
                  author: item.author || 'Unknown',
                  duration: (typeof item.duration === 'number') ? convertSStoHHMMSS(item.duration) :
                    (!item.duration.includes(':')) ? convertSStoHHMMSS(parseInt(item.duration)) :
                      (item.duration || 'NULL'),
                  authorId: item.channelUrl?.slice(9) || '',
                };
                newCollectionIds.push(id);
                newTracks[id] = newItem; // Add/update track in new tracks map
              } else {
                console.warn(`Skipping invalid CollectionItem in V1 collection '${key}' with ID '${id}':`, item);
                report.skipped++;
              }
            }
            if (key === 'history') {
              newCollectionIds.reverse();
            }
            saveCollection(key, newCollectionIds); // Save collection (array of IDs)
            metaUpdater(key); // Update metadata for the collection
            report.collections++;
            report.tracks += newCollectionIds.length;
            console.log(`Migrated collection: ${key}`);
          }
        }
      }
    }
    saveTracksMap(newTracks); // Save updated tracks map once after processing all collections

    // Remove the old V1 library
    localStorage.removeItem('library');

    const reportMessage = `Migration Report:
- Collections: ${report.collections}
- Tracks: ${report.tracks}
- Discovery items: ${report.discover}
- Playlists/Channels: ${report.lists}
- Skipped items: ${report.skipped}

Library migration successful. Reload to apply changes?`;

    if (confirm(reportMessage)) {
      location.reload();
    } else {
      setStore('snackbar', 'Library migrated. Please reload.');
    }

    console.log('Library migration complete.');

  } catch (error) {
    console.error('Error during library migration:', error);
    setStore('snackbar', 'Error migrating library. Please clear app data.');
  }
}
