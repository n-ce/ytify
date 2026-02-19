import { YTNodes } from 'youtubei.js';
import { getClient, streamMapper, listMapper, parsePublished } from './utils.js';

export default async function(params: { q: string, f?: string }) {
  const { q, f } = params;
  const yt = await getClient();

  if (f === 'song' || f === 'artist' || f === 'album') {
    const results = await yt.music.search(q, { type: f });
    const shelf = results.songs || results.artists || results.albums;
    return (shelf?.contents || [])
      .map((node) => (f === 'song' ? streamMapper(node) : listMapper(node)))
      .filter((item): item is NonNullable<ReturnType<typeof streamMapper>> => item !== null);
  }

  let type: 'video' | 'playlist' | 'channel' | 'all' = 'all';
  let sortBy: 'relevance' | 'upload_date' | 'view_count' | undefined;

  if (f === 'relevance' || f === 'upload_date' || f === 'view_count') {
    type = 'video';
    sortBy = f;
  } else if (f === 'playlist' || f === 'channel')
    type = f;

  const results = await yt.search(q, { type, sort_by: sortBy });
  const contents = (type === 'video' ? results.videos : results.results) || [];

  if (sortBy === 'upload_date') {
    contents.sort((a, b) => {
      const timeA = a.is(YTNodes.Video) ? parsePublished(a.as(YTNodes.Video).published?.toString() || '') : 0;
      const timeB = b.is(YTNodes.Video) ? parsePublished(b.as(YTNodes.Video).published?.toString() || '') : 0;
      return timeB - timeA;
    });
  }

  return contents
    .map((node) => streamMapper(node) || listMapper(node))
    .filter((item): item is NonNullable<ReturnType<typeof streamMapper>> => item !== null);
}
