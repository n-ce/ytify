import { setListStore, updateParam } from "@lib/stores";
import { convertSStoHHMMSS } from "@lib/utils";

export default async function(ids: string[]) {

  let index = 0;
  const piped = 'https://api.piped.private.coffee';
  function instance() {
    if (index < piped.length - 1)
      index++;
    else index = 0;
    return piped[index];
  }

  const fetcher = (id: string): Promise<{
    url: string,
    title: string,
    uploaderName: string,
    uploaderUrl: string,
    duration: number
  }[]> => fetch(instance() + '/playlists/RD' + id)
    .then(res => res.json())
    .then(data => data.message === 'Could not get playlistData' ?
      [] : data.relatedStreams)
    .catch(() => [])


  setListStore('isLoading', true);
  const data = await Promise.all(ids.map(fetcher));
  const map: {
    [index: string]: CollectionItem & { count?: number }
  } = {};

  data
    .flat()
    .map(s => ({
      id: s.url.substring(9),
      title: s.title,
      author: s.uploaderName,
      authorId: s.uploaderUrl.slice(9),
      duration: convertSStoHHMMSS(s.duration)
    }))
    .forEach(obj => {
      const key = obj.id;
      if (!ids.includes(key))
        key in map ?
          map[key].count!++ :
          map[key] = { ...obj, count: 1 };
    });

  const mixArray = Object
    .values(map)
    .sort((a, b) => b.count! - a.count!)


  setListStore('isLoading', false);
  setListStore({
    id: 'supermix',
    list: mixArray,
    isReversed: false
  });

  updateParam('supermix', ids.join('+'));

  document.title = 'Supermix - ytify';
}

