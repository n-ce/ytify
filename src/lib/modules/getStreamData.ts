import { store, setStore } from "../stores";
import { invidiousCircuit } from "@lib/utils/circuitBreaker";
import { fetchWithRetry } from "@lib/utils/fetch";

export default async function(
  id: string,
  prefetch: boolean = false,
  signal?: AbortSignal
): Promise<Invidious | Record<'error' | 'message', string>> {

  const tryFetch = async (instance: string) => {
    const url = `${instance}/api/v1/videos/${id}`;
    const response = await fetchWithRetry(url, { 
      signal,
      timeout: prefetch ? 5000 : 10000,
      maxRetries: prefetch ? 0 : 1 
    });
    
    const data = await response.json() as Invidious | { error: string };
    
    if ('adaptiveFormats' in data) {
      return data;
    }
    throw new Error((data as any).error || 'Invalid response structure');
  };

  // Guard: bail out if no instances are available
  if (!store.invidious.length) {
    return { error: 'No Invidious instances available', message: 'Could not fetch stream data — no instances configured' };
  }

  // 1. Try current instance first
  const currentIndex = store.index;
  const currentInstance = store.invidious[currentIndex];

  try {
     return await invidiousCircuit.execute(() => tryFetch(currentInstance));
  } catch (e) {
     console.warn(`Instance ${currentIndex} (${currentInstance}) failed:`, e);
  }

  // 2. Loop through others if current failed
  for (let i = 0; i < store.invidious.length; i++) {
    if (i === currentIndex) continue;

    try {
      const instance = store.invidious[i];
      const data = await invidiousCircuit.execute(() => tryFetch(instance));
      
      // Update preferred instance on success
      setStore('index', i);
      return data;
    } catch (e) {
      console.warn(`Instance ${i} failed:`, e);
    }
  }
  
  // 3. Last resort: local proxy or error
  return { error: 'All Invidious instances failed', message: 'Could not fetch stream data' };
}
