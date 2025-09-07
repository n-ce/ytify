import { For } from "solid-js";
import { generateImageUrl, getDB, getThumbIdFromLink } from "../../lib/utils";
import ListItem from "../../components/ListItem";

export default function(_: {
  flag: APAC
}) {

  const db = getDB();
  const error = `No ${_.flag} in Library`;
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

  if (!Object(db).hasOwnProperty(type))
    return error;

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

  return (
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
          uploader_data={item.uploaderName}
        />
      }
    </For>
  );
}
