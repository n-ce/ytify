import { playerStore } from '@lib/stores';
import { addToCollection, getCollection, removeFromCollection } from '@lib/utils/library';
import { createEffect, createSignal } from 'solid-js';

export default function() {

  const [isFav, setFav] = createSignal(false);

  createEffect(() => {
    const { id } = playerStore.stream;

    setFav(getCollection('favorites').includes(id));

  })

  return (
    <i
      aria-label="player_like"
      class={`ri-heart-${isFav() ? 'fill' : 'line'}`}
      onclick={async (e) => {
        e.stopPropagation();
        if (isFav())
          removeFromCollection('favorites', [playerStore.stream.id]);
        else
          addToCollection('favorites', [playerStore.stream]);

        setFav(!isFav());
      }}
    ></i>

  );
}
