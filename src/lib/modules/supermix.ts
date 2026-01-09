import fetchMix from "./fetchMix";

export default async function(ids: string[]): Promise<CollectionItem[]> {
  const promises = ids.map(id => 
    fetchMix('RD' + id).catch(() => [] as CollectionItem[])
  );

  const data = await Promise.all(promises);
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
