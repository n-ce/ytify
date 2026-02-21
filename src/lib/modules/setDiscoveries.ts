import { playerStore } from "@stores";
import { convertSStoHHMMSS, getCollection } from "@utils";
import { drawer, setDrawer } from "@utils";

type RecommendedVideo = {
  title: string;
  author: string;
  lengthSeconds: number;
  videoId: string;
  authorUrl: string;
  authorId: string;
};

export default function(
  id: string,
  relatedStreams: RecommendedVideo[]
) {
  if (id !== playerStore.stream.id) return;

  const discovery = [...(drawer.discovery || [])];

  relatedStreams?.forEach(
    stream => {
      if (
        stream.lengthSeconds < 100 || stream.lengthSeconds > 3000) return;

      const rsId = stream.videoId;

      const existingItem = discovery.find(item => item.id === rsId);

      if (existingItem) {
        existingItem.frequency++;
      } else {
        discovery.push({
          id: rsId,
          title: stream.title,
          author: stream.author,
          duration: convertSStoHHMMSS(stream.lengthSeconds),
          authorId: stream.authorId || stream.authorUrl?.slice(9) || '',
          type: 'video' as const,
          frequency: 1
        });
      }
    });

  // Randomize Array
  for (let i = discovery.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [discovery[i], discovery[j]] = [discovery[j], discovery[i]];
  }

  // remove if exists in history
  const history = getCollection('history');
  const filteredDiscovery = discovery.filter(e => !history.includes(e.id));

  // randomly remove items from array when limit crossed
  let len = filteredDiscovery.length;
  while (len > 256) {
    const i = Math.floor(Math.random() * len)
    filteredDiscovery.splice(i, 1);
    len--;
  }

  // insert the upgraded collection to discover;
  setDrawer('discovery', filteredDiscovery);

}
