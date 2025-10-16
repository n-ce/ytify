import fetchMix from "./fetchMix";

export default async function(ids: string[]): Promise<CollectionItem[]> {
  const data = await Promise.all(ids.map(id => fetchMix('RD' + id)));
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
