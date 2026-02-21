import { getMeta } from '@utils';
import { setStore } from '@stores';

interface OldListItem {
  id: string;
  name: string;
  img?: string;
  thumbnail?: string;
}

interface OldPlaylist extends OldListItem {
  author?: string;
  uploader?: string;
}

interface OldAlbum extends OldPlaylist {
  tracks?: string[];
}

export default function migrateV4toV5() {
  const meta = getMeta();
  if (meta.version !== 4) return;

  console.log('Migrating library from V4 to V5...');

  // 1. Migrate channels: rename thumbnail to img
  try {
    const channels = JSON.parse(localStorage.getItem('library_channels') || '[]') as OldListItem[];
    const migratedChannels: ListItem[] = channels.map(c => ({
      id: c.id,
      name: c.name,
      img: c.img || c.thumbnail || ''
    }));
    localStorage.setItem('library_channels', JSON.stringify(migratedChannels));
  } catch (e) {
    console.error('Failed to migrate channels:', e);
  }

  // 2. Migrate playlists: rename thumbnail to img, uploader to author, and remove albums
  try {
    const playlists = JSON.parse(localStorage.getItem('library_playlists') || '[]') as OldPlaylist[];
    const migratedPlaylists: Playlist[] = playlists
      .filter(p => !p.id.startsWith('OLAK5uy'))
      .map(p => ({
        id: p.id,
        name: p.name,
        img: p.img || p.thumbnail || '',
        author: p.author || p.uploader || ''
      }));
    localStorage.setItem('library_playlists', JSON.stringify(migratedPlaylists));
  } catch (e) {
    console.error('Failed to migrate playlists:', e);
  }

  // 3. Migrate library_albums: Convert from object to array
  try {
    const albums = JSON.parse(localStorage.getItem('library_albums') || '{}') as Record<string, OldAlbum>;
    const migratedAlbums: Album[] = [];
    Object.keys(albums).forEach(key => {
      // Only keep albums that already have a Browse ID (MPREb)
      if (key.startsWith('MPREb')) {
        const album = albums[key];
        migratedAlbums.push({
          id: key,
          name: album.name,
          img: album.img || album.thumbnail || '',
          author: album.author || album.uploader || ''
        });
      }
    });
    localStorage.setItem('library_albums', JSON.stringify(migratedAlbums));
  } catch (e) {
    console.error('Failed to migrate albums:', e);
  }

  meta.version = 5;
  localStorage.setItem('library_meta', JSON.stringify(meta));

  setStore('snackbar', 'Library updated to V5...Reloading..');
  location.reload();
  console.log('Library migration to V5 complete.');
}
