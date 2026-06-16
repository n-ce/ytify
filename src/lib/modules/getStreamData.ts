import { playerStore, setPlayerStore } from '@stores';
import { streamCache } from '@utils';

const instances = [
  "https://yt.omada.cafe",
];

export default async function(
  id: string,
  prefetch: boolean = false,
  signal?: AbortSignal
): Promise<Invidious | Record<'error' | 'message', string>> {

  const fetchData = async (proxy: string): Promise<Invidious> => {
    const path = proxy ? '/api/v1/videos/' : '/s/';
    const res = await fetch(proxy + path + id, {
      headers: { 'Accept': 'application/json' },
      signal
    });
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

  async function getData() {
    // 1. Try current proxy first if available
    if (playerStore.proxy || prefetch) {
      const p = playerStore.proxy || instances[0];
      try {
        const data = await fetchData(p);
        data.proxy = p;
        return data;
      } catch (e) {
        console.warn(`Prefetch failed with error ${(e as Error).message} on ${p}, starting retries...`);
      }
    }

    // 2. One by one retry through all instances
    for (const proxy of instances) {
      if (proxy === playerStore.proxy) continue;
      try {
        const data = await fetchData(proxy);
        setPlayerStore('proxy', proxy);
        data.proxy = proxy;
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
        setPlayerStore('proxy', '');
        data.proxy = '';
        // reset proxy to use local fallback
        return data;
      } catch (e) {
        console.error('Emergency fallback failed:', e);
      }
    }
  }
  const cached = streamCache.get(id) as Invidious;

  const data = cached || await getData();

  if (data) {
    streamCache.set(id, data);
    setPlayerStore('proxy', data.proxy || '');
    return data;
  }

  return { error: 'All proxies failed', message: 'Failed to fetch stream data from all available instances' };
}
