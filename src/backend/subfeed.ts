import fetchChannel from '../lib/modules/fetchChannel.js';
import { fetchUma, convertSStoHHMMSS } from '../lib/utils/pure.js';

export async function getSubfeed(channelIds: string[]): Promise<CollectionItem[]> {
  const instances = await fetchUma().catch(() => []);
  if (instances.length === 0) {
    throw new Error('No instances available');
  }

  // Pick a random instance
  const instance = instances[Math.floor(Math.random() * instances.length)];

  const promises = channelIds.map(id => fetchChannel(id, instance, 1));
  const results = await Promise.all(promises);

  const allVideos = results.flatMap(r => r.videos);

  // Sort by published timestamp (descending)
  allVideos.sort((a, b) => b.published - a.published);

  return allVideos
    .filter(v => v.lengthSeconds > 90)
    .map(v => ({
      id: v.videoId,
      title: v.title,
      duration: convertSStoHHMMSS(v.lengthSeconds),
      author: v.author,
      authorId: v.authorId
    }));
}
