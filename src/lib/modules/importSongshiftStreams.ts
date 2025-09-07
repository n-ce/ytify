import { setListStore, setStore, store } from "../stores";
import { convertSStoHHMMSS, getDB, saveDB } from "../utils";

type songshift = Record<'track' | 'album' | 'artist' | 'service', string>[];


export default async function(e: File) {
  const songshiftData = JSON.parse(await e.text()) as songshift;
  if (!Array.isArray(songshiftData)) {
    setStore('snackbar', 'Incompatible Database!');
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
      src
    }))
    .catch((e) => {
      if (apiIndex < piped.length - 1)
        return getMetadata(seed, src, apiIndex + 1);
      else {
        console.error(e);
        setStore('snackbar', 'Failed to import ' + seed);
        return;
      }
    });

  const promises = songshiftData.map(
    (s) => getMetadata(
      `${s.track} ${s.artist}`, s.service
    )
  );

  setListStore('isLoading', true);

  await Promise
    .all(promises)
    .then(d => {
      d.forEach(v => {
        if (v) {
          if (!db[v.src]) db[v.src] = {};
          db[v.src][v.id] = v as CollectionItem;
        }
      });
      saveDB(db);
      setStore('snackbar', 'The Songshift streams have been imported')
    })
    .finally(() => {
      setListStore('isLoading', false);
    });

}
