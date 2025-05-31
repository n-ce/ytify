import { loadingScreen } from "../lib/dom";
import { getDB, saveDB } from "../lib/libraryUtils";
import { store } from "../lib/store";
import { convertSStoHHMMSS, notify } from "../lib/utils";

type songshift = Record<'track' | 'album' | 'artist' | 'service', string>[];


export default async function(e: File) {
  const songshiftData = JSON.parse(await e.text()) as songshift;
  if (!Array.isArray(songshiftData)) {
    notify('Incompatible Database!');
    return;
  }
  const db = getDB();
  const { piped } = store.api;
  const getMetadata = async (
    seed: string,
    src = 'songshift',
    apiIndex = 0
  ): Promise<CollectionItem & { src: string } | undefined> => await fetch(`${piped[apiIndex]}/search?q=${encodeURIComponent(seed)}&filter=music_songs`)
    .then(res => res.json())
    .then(data => {
      if ('items' in data && data.items.length > 0)
        return data.items[0];
      else throw new Error('insufficient data');
    })
    .then((metadata: StreamItem) => ({
      id: metadata.url.substring(9),
      title: metadata.title,
      author: metadata.uploaderName + ' - Topic',
      duration: convertSStoHHMMSS(metadata.duration),
      channelUrl: metadata.uploaderUrl,
      src: src
    }))
    .catch((e) => {
      if (apiIndex < piped.length - 1)
        return getMetadata(seed, src, apiIndex + 1);
      else {
        console.error(e);
        notify('Failed to import ' + seed);
        return;
      }
    });

  const promises = songshiftData.map(
    (s) => getMetadata(
      `${s.track} ${s.artist}`, s.service
    )
  );
  loadingScreen.showModal();

  await Promise
    .all(promises)
    .then((d) => {
      d.forEach((v) => {
        if (v) {
          if (!db[v.src]) db[v.src] = {};
          db[v.src][v.id] = v as CollectionItem;
        }
      });
      saveDB(db);
      notify('The Songshift streams have been imported')
    })
    .finally(() => {
      if (loadingScreen.open)
        loadingScreen.close();
    });

}
