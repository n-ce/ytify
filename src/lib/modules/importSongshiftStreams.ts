import { setListStore, setStore } from "@lib/stores";
import { addToCollection, convertSStoHHMMSS } from "@lib/utils";

type songshift = Record<'track' | 'album' | 'artist' | 'service', string>[];


export default async function(e: File) {
  const songshiftData = JSON.parse(await e.text()) as songshift;
  if (!Array.isArray(songshiftData)) {
    setStore('snackbar', 'Incompatible Database!');
    return;
  }
  const piped = 'https://api.piped.private.coffee';
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
      authorId: metadata.uploaderUrl?.slice(9),
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
      const imports = d.filter(Boolean).map(v => ({
        id: v?.id,
        title: v?.title,
        author: v?.author,
        duration: v?.duration,
        authorId: v?.authorId
      })) as (CollectionItem & { src: string })[];

      const groupedBySource = imports.reduce((acc, track) => {
        const { src, ...rest } = track;
        if (!acc[src]) {
          acc[src] = [];
        }
        acc[src].push(rest as CollectionItem);
        return acc;
      }, {} as Record<string, CollectionItem[]>);

      for (const src in groupedBySource)
        addToCollection(src, groupedBySource[src]);

      setStore('snackbar', 'The Songshift streams have been imported')
    })
    .finally(() => {
      setListStore('isLoading', false);
    });

}
