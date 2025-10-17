import { getTracksMap, saveTracksMap, saveCollection, metaUpdater } from '@lib/utils/library';
import { setStore } from '@lib/stores';
import { getHub, updateHub } from '@lib/modules/hub';
import { convertSStoHHMMSS } from '@lib/utils/helpers';

type CollectionItemV1 = {
  id: string,
  title: string,
  author: string,
  duration: string | number
  channelUrl: string,
  lastUpdated?: string
}
type CollectionV1 = { [index: string]: CollectionItemV1 }

type Library = {
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
    const oldLibrary: Library = JSON.parse(localStorage.getItem('library')!);

    const newTracks = getTracksMap(); // Initialize tracks map once

    for (const key in oldLibrary) {
      if (oldLibrary.hasOwnProperty(key)) {
        const collectionData = oldLibrary[key];

        if (key === 'discover') {
          // Integrate discover migration logic
          const hub = getHub();
          // Assert type to include frequency
          if (!hub.discovery)
            hub.discovery = {};

          for (const id in collectionData) {
            const { title, duration, channelUrl, author, frequency } = collectionData[id] as CollectionItemV1 & { frequency: number };

            if (id.length !== 11) {
              console.warn(`Skipping invalid ID in V1 discover collection: ${id}`);
              report.skipped++;
              continue;
            }
            hub.discovery[id] = { id, author, title, duration: typeof duration === 'number' ? convertSStoHHMMSS(duration) : duration, frequency, authorId: channelUrl.slice(9) }
            report.discover++;
          }
          updateHub(hub);
          console.log(`Migrated discover collection to hub.`);
        } else if (key === 'channels' || key === 'playlists') {
          // Migrate channels and playlists (list types)
          // V2 stores channels/playlists as objects mapping IDs to Playlist/Channel objects
          localStorage.setItem(`library_${key}`, JSON.stringify(collectionData));
          metaUpdater(key);
          if (collectionData) {
            report.lists += Object.keys(collectionData).length;
          }
          console.log(`Migrated list type: ${key}`);
        } else {
          // Migrate other collections (history, favorites, listenLater, and custom collections)
          const newCollectionIds: string[] = [];
          for (const id in collectionData) {
            const item = collectionData[id] as CollectionItemV1;

            // Ensure item is a valid CollectionItem and omit 'lastUpdated'
            if (item && typeof item.id === 'string' && typeof item.title === 'string' && item.id.length === 11) {
              const newItem: CollectionItem = {
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
          if (key === 'history' || key === 'favorites') {
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
