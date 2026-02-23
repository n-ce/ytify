/*
> Get all related streams of a stream
> Check if stream exists in stream history or trash history or queue, if not enqueue it
> sometimes users will remove items from queue manually,
> we need to account for this using the trashHistory array
*/

import { playerStore, addToQueue } from "@stores";
import { convertSStoHHMMSS } from "@utils";

type RecommendedVideo = {
  title: string;
  author: string;
  lengthSeconds: number;
  videoId: string;
  authorId: string;
};

export default function(data: RecommendedVideo[]) {

  const { isMusic, stream } = playerStore;
  const currentTitle = stream.title;

  const tracksToAdd: TrackItem[] = data
    .filter(item => {
      const id = item.videoId;
      return (
        item.lengthSeconds > 45 &&
        !(sessionStorage.getItem('trashHistory') || '').includes(id) &&
        (!isMusic || item.author.endsWith(' - Topic'))
      );
    })
    .map(item => ({
      id: item.videoId,
      title: item.title,
      author: item.author,
      authorId: item.authorId,
      duration: convertSStoHHMMSS(item.lengthSeconds),
      context: {
        src: 'queue',
        id: `Related to ${currentTitle}`
      }
    }));

  if (tracksToAdd.length > 0) {
    addToQueue(tracksToAdd);
  }
}
