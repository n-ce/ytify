import { playerStore } from "../stores";

export default async function(
  id: string,
  prefetch: boolean = false,
  signal?: AbortSignal
): Promise<Invidious | Record<'error' | 'message', string>> {

  const fetchData = (proxy?: string) =>
    fetch(`${proxy || ''}/api/v1/videos/${id}`, { signal })
      .then(res => res.json() as Promise<Invidious | { error: string }>)
      .then(data => {
        if ('adaptiveFormats' in data) return data;
        else throw new Error(data.error || 'Invalid response');
      });

  return fetchData(playerStore.proxy)
    .catch(e => {
      return prefetch ? e : fetchData()
        .catch(() => e);
    });
}
