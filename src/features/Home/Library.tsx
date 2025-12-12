import { For, Show } from "solid-js";
import Collections from "./Collections";
import SubLists from "./SubLists";
import { getLibraryAlbums, generateImageUrl, getThumbIdFromLink } from "@lib/utils";
import { t } from "@lib/stores";
import ListItem from "@components/ListItem";


const NewAlbums = () => {
  const newAlbums = getLibraryAlbums();
  const albumIds = Object.keys(newAlbums);

  const array = albumIds.map(albumId => {
    const album = newAlbums[albumId];
    return {
      type: 'playlist',
      name: album.name,
      uploaderName: album.artist,
      url: `/playlist/` + albumId,
      thumbnail: album.thumbnail
    };
  });

  return (
    <Show when={array.length > 0}>
      <article>
        <p>
          <i class="ri-album-fill"></i>&nbsp;
          {t('library_albums')}
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
};


export default function() {
  return (
    <div class='library'>
      <Collections />
      <br />
      <NewAlbums />
      <br />
      <For each={['albums', 'playlists', 'channels']}>
        {(item) =>
          <SubLists flag={item as 'albums' | 'playlists' | 'channels'} />
        }
      </For>
    </div>
  );
}
