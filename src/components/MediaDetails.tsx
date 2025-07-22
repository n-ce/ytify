import { store } from "../lib/store";
import { hostResolver, i18n } from "../lib/utils";

export default function() {

  return (
    <div class="mediaDetails">
      <a
        id="title"
        href={hostResolver(`/watch?v=${store.stream.id}`)}
        target="_blank"
      >{
          store.player.title || i18n('player_now_playing')
        }</a>
      <p id="author">{store.stream.author.replace('- Topic', '') || i18n('player_channel')}</p>
    </div>
  );

}
