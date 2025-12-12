import fetchMix from "./fetchMix";
import { store } from "@lib/stores";

export default async function(ids: string[]): Promise<CollectionItem[]> {

  const idx = () => Math.floor(Math.random() * store.invidious.length);


  const data = await Promise.all(ids.map(id => fetchMix('RD' + id, store.invidious[idx()])));
  const map: {
    [index: string]: CollectionItem & { count?: number }
  } = {};

  data
    .flat()
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

  return mixArray;
}
