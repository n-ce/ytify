import { Accessor, Show, createSignal } from 'solid-js';
import './StreamItem.css';
import { config, hostResolver, player, removeFromCollection, getCollectionItems } from '@lib/utils';
import { generateImageUrl } from '@lib/utils/image';
import { listStore, setNavStore, setPlayerStore, setStore, store, setQueueStore, navStore, playerStore } from '@lib/stores';

export default function(data: YTItem & {
  draggable?: boolean,
  context?: {
    src: Context,
    id: string
  },
  mark?: {
    mode: Accessor<boolean>,
    set: (id: string) => void,
    get: (id: string) => boolean
  },
  removeMode?: boolean
}) {

  const [getImage, setImage] = createSignal('');

  let parent!: HTMLAnchorElement;


  function handleThumbnailLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    const src = getImage();

    if (img.naturalWidth !== 120) {
      parent.classList.remove('ravel');
      return;
    }
    if (src.includes('webp'))
      setImage(src.replace('.webp', '.jpg').replace('vi_webp', 'vi'));
    else {
      // most likely been removed from yt so remove it
      if (data.context)
        removeFromCollection(data.context?.id, [data.id])
    }
  }

  function handleThumbnailError() {

    const src = getImage();

    setImage(
      src.includes('vi_webp') ?
        src.replace('.webp', '.jpg').replace('vi_webp', 'vi') :
        '/logo192.png'
    );

    parent.classList.remove('ravel');
  }



  const isAlbum = data.context?.id.startsWith('MPREb') || listStore.type === 'album';
  const isFromArtist = data.context?.id?.startsWith('Artist - ');
  const isMusic = data.author?.endsWith('- Topic');

  if (config.loadImage && !isAlbum)
    setImage(generateImageUrl(data.img || data.id, 'mq', data.context?.id === 'favorites' || isFromArtist || ((data.context?.src === 'queue') && isMusic)));

  return (
    <a
      class='streamItem card card--interactive'
      classList={{
        'ravel': config.loadImage && !isAlbum,
        'marked': data.mark?.get(data.id),
        'delete': data.removeMode
      }}
      href={hostResolver('/watch?v=' + data.id)}
      ref={parent}
      onclick={(e) => {
        e.preventDefault();

        if (data.removeMode) {
          setQueueStore('list', (list) => list.filter((item) => item.id !== data.id));
          return;
        }

        if (data.mark?.mode()) {
          data.mark.set(data.id);
          return;
        }

        if (!e.target.classList.contains('ri-more-2-fill')) {


          setPlayerStore('stream', {
            id: data.id,
            title: data.title,
            author: data.author || '',
            duration: data.duration,
            authorId: data.authorId || '',
          });

          if (data.albumId)
            setPlayerStore('stream', 'albumId', data.albumId);
          else if (playerStore.stream.albumId)
            setPlayerStore('stream', 'albumId', undefined);


          if (data.context)
            setPlayerStore('context', {
              id: data.context.id,
              src: data.context.src
            });


          const isPortrait = matchMedia('(orientation:portrait)').matches;

          if (isPortrait || config.landscapeSections === '1') {
            setNavStore('player', 'state', Boolean(config.watchMode));

            if (config.watchMode)
              navStore.player.ref?.scrollIntoView();
          }

          if (config.contextualFill && (data.context?.src === 'collection' || (data.context?.src === 'playlists')) && data.context?.id !== 'history') {
            const collectionItems = data.context.src === 'collection' ? getCollectionItems(data.context.id) :
              listStore.list;
            const currentIndex = collectionItems.findIndex(item => item.id === data.id);
            if (currentIndex !== -1) {
              const zigzagQueue: TrackItem[] = [];
              let left = currentIndex - 1;
              let right = currentIndex + 1;
              const len = collectionItems.length;

              while (left >= 0 || right < len) {
                if (right < len) {
                  zigzagQueue.push(collectionItems[right++]);
                }
                if (left >= 0) {
                  zigzagQueue.push(collectionItems[left--]);
                }
              }
              setQueueStore('list', zigzagQueue);
            }
          }

          player(data.id);


          if (data.context?.src === 'queue') {
            const indexToRemove = parseInt(data.context.id, 10);
            setQueueStore('list', (list) =>
              list.filter((_, idx) => idx !== indexToRemove)
            );
          }
        }
        else {
          setStore('actionsMenu', {
            id: data.id,
            title: data.title,
            author: data.author,
            duration: data.duration,
            authorId: data.authorId,
          });


          const { albumId } = data;
          if (store.actionsMenu?.albumId)
            setStore('actionsMenu', 'albumId', undefined);
          if (albumId)
            setStore('actionsMenu', 'albumId', albumId);

        }
      }}
    >
      <span>
        <Show when={!isAlbum && config.loadImage} fallback={data.duration}>

          <img
            crossorigin='anonymous'
            onerror={handleThumbnailError}
            onload={handleThumbnailLoad}
            src={getImage()}
          />
          <p class='duration'>{data.duration}</p>
        </Show>
      </span>
      <div class='metadata'>
        <p class='title'>{data.title}</p>
        <div class='avu'>
          <p class='author truncate'>{data.author?.replace(' - Topic', '')}</p>
          <Show when={!isAlbum}>
            <p class='viewsXuploaded truncate'>{data.subtext}</p>
          </Show>
        </div>
      </div>
      <Show when={data.draggable}>
        <i aria-label="Drag" class="ri-draggable"></i>
      </Show>
      <Show when={!data.draggable && data.context?.src !== 'queue'}>
        <i aria-label="More" class="ri-more-2-fill"></i>
      </Show>
    </a>
  )
}
