import { onMount } from "solid-js";
import { addToCollection, createCollection, getDB, reservedCollections } from "../lib/libraryUtils";

export default function CollectionSelector(_: {
  collection: CollectionItem,
  close: () => void
}) {


  onMount(() => {

    const initialKeys = Object.keys(getDB());

    for (const key of initialKeys)
      if (!reservedCollections.includes(key))
        createCollection(key);
  });

  return (
    <li>
      <i class="ri-play-list-add-line"></i>
      <select
        tabindex={2}
        id="collectionSelector"
        onchange={(e) => {
          const clxnSlctr = e.target;
          let title;

          if (!clxnSlctr.value) return;
          if (clxnSlctr.value === '+cl') {
            title = prompt('Collection Title')?.trim();

            if (title)
              createCollection(title);
          }
          else title = clxnSlctr.value;

          if (title)
            addToCollection(title, _.collection);

          _.close();
          clxnSlctr.selectedIndex = 0;
        }}
      >
          <option data-translation="collection_selector_add_to">Add To</option>
          <option data-translation="collection_selector_create_new" value="+cl">Create New Collection</option>
          <option data-translation="collection_selector_favorites" value="favorites">Favorites</option>
          <option data-translation="collection_selector_listen_later" value="listenLater">Listen Later</option>
      </select>
    </li>
  );
}
