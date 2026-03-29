import { YTNodes } from 'youtubei.js';
import { getClient, streamMapper, listMapper, parsePublished } from './utils.js';

type Feature = 'hd' | 'subtitles' | 'creative_commons' | '3d' | 'live' | 'purchased' | '4k' | '360' | 'location' | 'hdr' | 'vr180';

type SearchFilters = {
  upload_date?: 'all' | 'today' | 'week' | 'month' | 'year';
  type?: 'all' | 'video' | 'shorts' | 'channel' | 'playlist' | 'movie';
  duration?: 'all' | 'over_twenty_mins' | 'under_three_mins' | 'three_to_twenty_mins';
  prioritize?: 'relevance' | 'popularity';
  features?: Feature[];
};

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

  const filters: SearchFilters = {};

  if (f === 'relevance' || f === 'upload_date' || f === 'view_count') {
    filters.type = 'video';
    if (f === 'relevance') filters.prioritize = 'relevance';
    else if (f === 'upload_date') filters.upload_date = 'all';
    else if (f === 'view_count') filters.prioritize = 'popularity';
  } else if (f === 'playlist' || f === 'channel')
    filters.type = f;

  const results = await yt.search(q, filters);
  const contents = (filters.type === 'video' ? results.videos : results.results) || [];

  if (f === 'upload_date') {
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
