import { playerStore, store, t } from "../../lib/stores";
import { hostResolver } from "../../lib/utils";

export default function() {

  return (
    <div class="mediaDetails">
      <a
        id="title"
        href={hostResolver(`/watch?v=${store.stream.id}`)}
        target="_blank"
      >{
          playerStore.title || t('player_now_playing')
        }</a>
      <p id="author">{store.stream.author.replace('- Topic', '') || t('player_channel')}</p>
    </div>
  );

}
