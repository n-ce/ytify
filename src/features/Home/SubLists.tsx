import { For, Show } from "solid-js";
import { generateImageUrl, getDB, getThumbIdFromLink } from "@lib/utils";
import { t } from "@lib/stores";
import ListItem from "@components/ListItem";

export default function(_: {
  flag: APAC
}) {

  const db = getDB();
  let type = _.flag;
  let len = 0;

  if (_.flag === 'albums') {
    type = 'playlists';
    len = 8;
  }
  if (_.flag === 'artists') {
    type = 'channels';
    len = 9;
  }

  const special = type === 'playlists' ? 'Album' : 'Artist';



  const array = [];
  const pls = db[type] as { [index: string]: Record<'name' | 'uploader' | 'thumbnail' | 'id', string> };

  for (const pl in pls) {
    const name = pls[pl].name;

    if (_.flag !== type) {
      if (!name.startsWith(special))
        continue;
    }
    else if (name.startsWith(special))
      continue;

    array.push({
      type: type.slice(0, -1),
      name: name.slice(len),
      uploaderName: pls[pl].uploader,
      url: `/${type === 'channels' ? type.slice(0, -1) : type}/` + pls[pl].id,
      thumbnail: pls[pl].thumbnail
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
                stats={''}
                title={item.name}
                url={item.url}
                thumbnail={generateImageUrl(
                  getThumbIdFromLink(
                    item.thumbnail
                  ), '')}
                uploaderData={item.uploaderName}
              />
            }
          </For>
        </div>
      </article>
    </Show>
  );
}
