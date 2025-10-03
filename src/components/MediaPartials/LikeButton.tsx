import { playerStore } from '@lib/stores';
import { addToCollection, getDB, removeFromCollection } from '@lib/utils/library';

export default function() {

  const favState = () => getDB().favorites?.hasOwnProperty(playerStore.stream.id);

  return (
    <i
      aria-label="player_like"
      class={`ri-heart-${favState() ? 'fill' : 'line'}`}
      onclick={async () => {
        if (favState())
          addToCollection('favorites', playerStore.stream)
        else
          removeFromCollection('favorites', playerStore.stream.id);
      }}
    ></i>

  );
}
