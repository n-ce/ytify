import { createMemo, Accessor } from 'solid-js';
import { listStore } from '@lib/stores';

type SortOrder = 'modified' | 'name' | 'artist' | 'duration';

export function useSortedList(sortOrderSignal: Accessor<SortOrder>) {
  const sortedList = createMemo(() => {
    const currentList = listStore.list;
    const currentSortOrder = sortOrderSignal();

    // If the current collection is history or favorites, or sort order is 'modified', return the list as is.
    // This ensures no unnecessary sorting overhead for these cases.
    if (listStore.id === 'history' || listStore.id === 'favorites' || currentSortOrder === 'modified') {
      return currentList;
    }

    // Otherwise, apply sorting
    const listToSort = [...currentList]; // Create a shallow copy to avoid mutating the original listStore.list

    listToSort.sort((a, b) => {
      switch (currentSortOrder) {
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
          return 0; // Should not be reached if 'modified' is handled above
      }
    });

    return listToSort;
  });

  return sortedList;
}
