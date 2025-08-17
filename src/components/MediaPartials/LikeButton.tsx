import { store } from '../../lib/stores';
import { addToCollection, getDB, removeFromCollection } from '../..//lib/utils/library';

export default function() {

  const favState = () => getDB().favorites?.hasOwnProperty(store.stream.id);

  return (
    <button
      aria-label="player_like"
      class={`ri-heart-${favState() ? 'fill' : 'line'}`}
      id="favButton"
      onclick={async () => {
        if (!store.stream.id) return;

        if (favState())
          addToCollection('favorites', store.stream)
        else
          removeFromCollection('favorites', store.stream.id);
      }}
    />

  );
}
