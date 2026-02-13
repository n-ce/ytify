import { For, Show } from "solid-js";
import { getLists } from "@lib/utils";
import { t } from "@lib/stores";
import ListItem from "@components/ListItem";

export default function(_: {
  flag: 'albums' | 'playlists' | 'channels'
}) {

  let type = _.flag;
  let len = 0;

  if (_.flag === 'albums') {
    type = 'playlists';
    len = 8;
  }


  const special = type === 'playlists' ? 'Album' : 'Artist';

  const array = [];
  const pls = getLists(type as 'channels' | 'playlists'); // Removed redundant cast

  for (const pl of pls) {
    const name = pl.name;

    if (_.flag !== type) {
      if (!name.startsWith(special))
        continue;
    }
    else if (name.startsWith(special))
      continue;

    array.push({
      type: type.slice(0, -1),
      name: name.slice(len),
      img: pl.img,
      author: (pl as Playlist).author,
      id: pl.id
    });

  }

  const icons = {
    albums: 'ri-album-fill',
    channels: 'ri-tv-fill',
    artists: 'ri-user-heart-fill',
    playlists: 'ri-youtube-fill'
  }

  return (
    <Show when={array.length > 0}>
      <article>
        <p>
          <i class={icons[_.flag]}></i>&nbsp;
          {t('library_' + _.flag as 'library_albums')}
        </p>
        <div>
          <For each={array}>
            {(item) =>
              <ListItem
                name={item.name}
                id={item.id}
                img={item.img}
                author={item.author}
                type='album'
              />
            }
          </For>
        </div>
      </article>
    </Show>
  );
}
