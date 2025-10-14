import { Accessor, Show, createSignal } from 'solid-js';
import './StreamItem.css';
import { config, hostResolver, player, removeFromCollection } from '@lib/utils';
import { generateImageUrl } from '@lib/utils/image';
import { setNavStore, setPlayerStore, setStore, store, setQueueStore } from '@lib/stores';

export default function(data: {
  id: string,
  title: string,
  author?: string,
  duration: string,
  uploaded?: string,
  authorId?: string,
  views?: string,
  img?: string,
  albumId?: string,
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



  if (config.loadImage)
    setImage(generateImageUrl(data.img || data.id, 'mq'));

  return (
    <a
      class='streamItem'
      classList={{
        'ravel': config.loadImage,
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
          setPlayerStore('stream', data);
          if (data.context)
            setPlayerStore('context', {
              id: data.context.id,
              src: data.context.src
            });
          const isPortrait = matchMedia('(orientation:portrait)').matches;
          if (isPortrait || config.landscapeSections === '1')
            setNavStore('player', 'state', false);
          player(data.id);
          if (data.context?.src === 'queue') {
            const indexToRemove = parseInt(data.context.id, 10);
            setQueueStore('list', (list) =>
              list.splice(indexToRemove, 1)
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
        <Show when={config.loadImage} fallback={data.duration}>
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
          <p class='author'>{data.author?.replace(' - Topic', '')}</p>
          <p class='viewsXuploaded'>{(data.views || '') + (data.uploaded ? ' • ' + data.uploaded.replace('Streamed ', '') : '')}</p>
        </div>
      </div>
      {data.draggable ?
        <i class="ri-draggable"></i> :
        <i class="ri-more-2-fill"></i>
      }
    </a>
  )
}
