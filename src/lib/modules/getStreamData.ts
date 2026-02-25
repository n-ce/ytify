import { playerStore, setPlayerStore } from '@stores';
import { shuffle } from '@utils';

const instances = [
  "https://lekker.gay",
  "https://yt.omada.cafe"
];

let isFetching = false;

async function fetchInstances() {
  if (isFetching) return;
  isFetching = true;
  await fetch('https://stremion.zeabur.app/api/instances')
    .then(res => res.json() as Promise<string[]>)
    .then(data => {
      if (Array.isArray(data)) {
        instances.unshift(...shuffle(data));
      }
    })
    .catch(err => {
      console.error('Failed to fetch instances:', err);
      isFetching = false; // allow retry on next call
    });
}

export default async function(
  id: string,
  prefetch: boolean = false,
  signal?: AbortSignal
): Promise<Invidious | Record<'error' | 'message', string>> {

  if (!isFetching) await fetchInstances();

  const fetchData = async (proxy: string): Promise<Invidious> => {
    const res = await fetch(`${proxy}/api/v1/videos/${id}`, { signal });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    if (!data || !('adaptiveFormats' in data) || !Array.isArray(data.adaptiveFormats)) {
      throw new Error(data?.error || 'Invalid response: adaptiveFormats missing or not an array');
    }

    if (!data.adaptiveFormats.every((f: { type: string }) => typeof f.type === 'string')) {
      throw new Error('Invalid response: formats missing type property');
    }

    if (!data.adaptiveFormats.some((f: { type: string }) => f.type.startsWith('audio'))) {
      throw new Error('Invalid response: no audio streams found');
    }

    return data;
  };

  // 1. Try current proxy first if available
  if (playerStore.proxy || prefetch) {
    const p = playerStore.proxy || instances[0];
    try {
      return await fetchData(p);
    } catch (e) {
      if (prefetch) return { error: 'Prefetch failed', message: (e as Error).message };
      console.warn(`Current proxy ${p} failed, starting retries...`);
    }
  }

  // 2. One by one retry through all instances
  for (const proxy of instances) {
    if (proxy === playerStore.proxy) continue;
    try {
      const data = await fetchData(proxy);
      setPlayerStore('proxy', proxy);
      return data;
    } catch (e) {
      console.warn(`Proxy ${proxy} failed, trying next...`);
    }
  }

  // 3. Last resort: Emergency Fallback (Local Edge Function)
  if (!prefetch) {
    try {
      console.warn('All proxies failed, attempting emergency fallback...');
      const data = await fetchData('');
      setPlayerStore('proxy', ''); // reset proxy to use local fallback
      return data;
    } catch (e) {
      console.error('Emergency fallback failed:', e);
    }
  }

  return { error: 'All proxies failed', message: 'Failed to fetch stream data from all available instances' };
}
