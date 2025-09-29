import { setListStore, store } from "@lib/stores";

export default async function(channels: string[]) {

  setListStore('isLoading', true);
  const { piped } = store.api;
  const current = Date.now();
  const twoWeeksMs = 2 * 7 * 24 * 60 * 60 * 1000;
  const items: StreamItem[] = [];
  const fetcher = (apis: string) => fetch(apis + '/feed/unauthenticated?channels=' + channels.join(','))
    .then(res => res.json())
    .then((data: StreamItem[]) => {
      if (data?.length) {
        const isLong = data.filter(i => i.duration > 90);
        isLong
          .filter(i => !items.find(v => i.url === v.url))
          .forEach(i => items.push(i));
      }
    })
    .catch(() => []);

  return Promise
    .all(piped.map(fetcher))
    .then(() => items
      .filter(i => (current - i.uploaded) < twoWeeksMs)
      .sort((a, b) => b.uploaded - a.uploaded)
    )
    .finally(() => {
      setListStore('isLoading', true);
    });

}
