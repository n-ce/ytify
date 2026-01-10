import { store, setStore } from "../stores";

export default async function(
  id: string,
  prefetch: boolean = false,
  signal?: AbortSignal
): Promise<Invidious | Record<'error' | 'message', string>> {


  const fetchDataFromInvidious = (
    index: number
  ) => fetch(`${index === -1 ? '' : store.invidious[index]}/api/v1/videos/${id}`, { signal })
    .then(res => res.json() as Promise<Invidious | { error: string }>)
    .then(data => {
      if ('adaptiveFormats' in data) {
        setStore('index', index === -1 ? 0 : index);
        return data;
      }
      else throw new Error(data.error || 'Invalid response');
    });


  const useInvidious = (index = store.index): Promise<Invidious> =>
    fetchDataFromInvidious(index)
      .catch(e => {
        if (index + 1 === store.invidious.length) {
          setStore('index', 0);
          return prefetch ? e :
            fetchDataFromInvidious(-1)
              .catch(() => e);
        }
        else return useInvidious(index + 1);
      });

  return useInvidious();
}
