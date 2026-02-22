
/*
> Get all related streams of a stream
> Check if stream exists in stream history or trash history or queue, if not enqueue it
> sometimes users will remove items from queue manually,
> we need to account for this using the trashHistory array
*/

import { playerStore } from "@stores";
import { setQueueStore } from "@stores";
import { convertSStoHHMMSS } from "@utils";

type RecommendedVideo = {
  title: string;
  author: string;
  lengthSeconds: number;
  videoId: string;
  authorId: string;
};

export default function(data: RecommendedVideo[]) {

  const { history, isMusic, stream } = playerStore;
  const currentTitle = stream.title;


  data.forEach(stream => {

    const id = stream.videoId;

    if (
      stream.lengthSeconds > 45 &&
      !(sessionStorage.getItem('trashHistory') || '').includes(id) &&
      !history.some(item => item.id === id) &&
      (!isMusic || stream.author.endsWith(' - Topic'))
    )
      setQueueStore('list', l => [...l, ({
        id: id,
        title: stream.title,
        author: stream.author,
        authorId: stream.authorId,
        duration: convertSStoHHMMSS(stream.lengthSeconds),
        context: {
          src: 'queue',
          id: `Related to ${currentTitle}`
        }
      }) as TrackItem])
  });

}
