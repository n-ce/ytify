export const streamCache = {
  get: (id: string): Invidious | null => {
    try {
      const data = sessionStorage.getItem(`streamData_${id}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to parse stream data from cache', e);
      return null;
    }
  },
  set: (id: string, data: Invidious) => {
    try {
      sessionStorage.setItem(`streamData_${id}`, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save stream data to cache (possibly storage limit reached)', e);
    }
  },
  clear: () => {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('streamData_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
};
