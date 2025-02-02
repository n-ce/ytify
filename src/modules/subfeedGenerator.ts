import { loadingScreen } from "../lib/dom";
import { store } from "../lib/store";

export default async function(channels: string[]) {

  loadingScreen.showModal();

  const apis = store.api.piped.concat(store.player.hls.api);
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
    .all(apis.map(fetcher))
    .then(() => items
      .filter(i => (current - i.uploaded) < twoWeeksMs)
      .sort((a, b) => b.uploaded - a.uploaded)
    )
    .finally(() => loadingScreen.close());

}
