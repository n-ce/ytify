import { playerStore, store } from '@lib/stores';
import { addToCollection, getCollection, removeFromCollection } from '@lib/utils/library';
import { createEffect, createSignal } from 'solid-js';

export default function() {

  const item = () => store.actionsMenu || playerStore.stream;
  const isMusic = () => item().author?.endsWith(' - Topic');
  const collection = () => isMusic() ? 'favorites' : 'liked';
  const icon = () => isMusic() ? 'ri-heart' : 'ri-thumb-up';

  const [isLiked, setIsLiked] = createSignal(false);


  createEffect(() => {
    if (item().id)
      setIsLiked(getCollection(collection()).includes(item().id));
  })

  return (
    <i
      aria-label={`${collection()}`}
      class={`${icon()}-${isLiked() ? 'fill' : 'line'}`}
      onclick={async (e) => {
        e.stopPropagation();
        if (isLiked())
          removeFromCollection(collection(), [item().id]);
        else
          addToCollection(collection(), [item()]);

        setIsLiked(!isLiked());
      }}
    ></i>
  );
}
