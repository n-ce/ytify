import { For, Show, lazy, onMount, createSignal } from "solid-js";
import './Library.css';
import Collections from "./Collections";
import SubLists from "./SubLists";
import { getLibraryAlbums, generateImageUrl, getThumbIdFromLink, drawer, config } from "@lib/utils";
import { t, setListStore, setNavStore, store } from "@lib/stores";
import ListItem from "@components/ListItem";
import Dropdown from "./Dropdown";

const Gallery = lazy(() => import('./Gallery'));

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
  const [showGallery, setShowGallery] = createSignal(false);
  let libraryRef!: HTMLElement;
  let syncBtn!: HTMLElement;

  onMount(() => {
    libraryRef.scrollIntoView();
    setNavStore('library', 'ref', libraryRef);
  });

  return (
    <section class="library" ref={libraryRef}>
      <header>
        <p>{t('nav_library')}</p>

        <div class="right-group">
          <Show when={config.dbsync}>
            <i
              id="syncNow"
              classList={{
                'ri-cloud-fill': store.syncState === 'synced',
                'ri-loader-3-line': store.syncState === 'syncing',
                'ri-cloud-off-fill': store.syncState === 'dirty' || store.syncState === 'error',
                'error': store.syncState === 'error',
              }}
              aria-label={
                (store.syncState === 'dirty' || store.syncState === 'error') ?
                  'Save to Cloud' :
                  store.syncState === 'synced' ?
                    'Import from Cloud' : 'Syncing'
              }
              ref={syncBtn}
              onclick={() => {
                import('@lib/modules/cloudSync').then(({ runSync }) => {
                  runSync(config.dbsync);
                });
              }}
            ></i>
          </Show>

          <i
            aria-label={t('hub_subfeed')}
            class="ri-tv-fill"
            onclick={() => {
              const subfeedItems = drawer.subfeed || [];
              setListStore({
                name: t('hub_subfeed'),
                list: subfeedItems as CollectionItem[],
              });
              setNavStore('list', 'state', true);
            }}
          ></i>

          <i
            aria-label={t('hub_gallery')}
            class="ri-user-heart-line"
            classList={{ 'ri-user-heart-fill': showGallery() }}
            onclick={() => setShowGallery(!showGallery())}
          ></i>
        </div>

        <Dropdown />
      </header>

      <Show when={showGallery()}>
        <Gallery />
      </Show>
      <Collections />
      <br />
      <NewAlbums />
      <br />
      <For each={['albums', 'playlists']}>
        {(item) =>
          <SubLists flag={item as 'albums' | 'playlists'} />
        }
      </For>
    </section>
  );
}
