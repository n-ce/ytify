import { playerStore } from "@stores";
import { hostResolver } from "@utils";

export default function() {

  return (
    <div class="mediaDetails">
      <a
        id="title"
        href={hostResolver(`/watch?v=${playerStore.stream.id}`)}
        target="_blank"
      >{
          playerStore.status ||
          playerStore.stream.title
        }</a>
      <p id="author">{playerStore.stream.author?.replace('- Topic', '') ?? ''}</p>
    </div>
  );

}
