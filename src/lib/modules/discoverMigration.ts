import { getHub, updateHub } from './hub';

const LIBRARY_STORAGE_KEY = 'library';
const MIGRATION_FLAG_KEY = 'hub_migration_complete';

interface WithDiscover {
  discover?: {
    [index: string]: CollectionItem & { frequency: number }
  };
}

export function runMigration() {
  const migrationComplete = localStorage.getItem(MIGRATION_FLAG_KEY);

  if (migrationComplete) {
    return;
  }

  const libraryData = localStorage.getItem(LIBRARY_STORAGE_KEY);

  if (libraryData) {
    const library = JSON.parse(libraryData) as WithDiscover;

    if (library.discover) {
      const hub = getHub();
      hub.discovery = library.discover;
      updateHub(hub);

      delete library.discover;
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
    }
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}
